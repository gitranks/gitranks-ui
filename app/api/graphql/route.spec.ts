import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { request, current } = vi.hoisted(() => ({
  request: vi.fn(async (_query: string, _variables?: unknown, _options?: unknown) => ({
    data: { ok: 1 },
    status: 200,
  })),
  current: { session: null as Session | null },
}));

vi.mock('@/auth', () => ({ auth: async () => current.session }));
vi.mock('@/lib/graphql/request', () => ({ request }));
vi.mock('@/utils/reject-wrong-origin', () => ({ rejectWrongOrigin: () => false }));

const { POST } = await import('./route');

const QUERY = 'query { user(login: "octocat") { login } }';
const post = (query = QUERY) =>
  POST(
    new NextRequest('https://gitranks.com/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'user-agent': 'spec' },
      body: JSON.stringify({ query, variables: { a: 1 } }),
    }),
  );
const sessionOf = (user: Record<string, unknown>, error?: string) =>
  ({ user, expires: '2099-01-01T00:00:00.000Z', ...(error ? { error } : {}) }) as Session;

describe('the GraphQL passthrough', () => {
  beforeEach(() => {
    request.mockClear();
    current.session = null;
  });

  it("signs a signed-in viewer's call with the session's login and email", async () => {
    current.session = sessionOf({ githubLogin: 'octocat', email: 'octo@example.com' });
    const response = await post();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: 1 });
    expect(request).toHaveBeenCalledWith(
      QUERY,
      { a: 1 },
      {
        originalUserAgent: 'spec',
        source: 'client',
        githubLogin: 'octocat',
        accountEmail: 'octo@example.com',
      },
    );
  });

  it('signs with the login alone when the session has no usable email', async () => {
    for (const email of [undefined, null, '', 'not an address']) {
      request.mockClear();
      current.session = sessionOf({ githubLogin: 'octocat', email });
      await post();
      expect(request.mock.calls[0][2], String(email)).toEqual({
        originalUserAgent: 'spec',
        source: 'client',
        githubLogin: 'octocat',
      });
    }
  });

  it('signs with neither signed out, nor for a session that needs a new sign-in', async () => {
    await post();
    current.session = sessionOf({ githubLogin: 'octocat', email: 'octo@example.com' }, 'RefreshTokenError');
    await post();

    for (const [, , options] of request.mock.calls) {
      expect(options).toEqual({ originalUserAgent: 'spec', source: 'client', githubLogin: undefined });
    }
  });

  it.each([
    'query { ...Root } fragment Root on Query { contribute { previewAllowed } }',
    'query { ... on Query { contribute { previewAllowed } } }',
    'query { contribute { previewAllowed } }',
  ])('refuses %s without asking the API', async (query) => {
    const response = await post(query);

    expect(response.status).toBe(403);
    expect(request).not.toHaveBeenCalled();
  });
});
