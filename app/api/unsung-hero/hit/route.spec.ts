import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMaySeePackages, sessionTokenOf, signedFetch } = vi.hoisted(() => ({
  requestMaySeePackages: vi.fn(async (_req: unknown) => true),
  sessionTokenOf: vi.fn(),
  signedFetch: vi.fn(async (..._args: unknown[]) => new Response(null, { status: 204 })),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ requestMaySeePackages }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { POST } = await import('./route');

const visit = { kind: 'visit', repo: 'octo-labs/scroll-guard' };
const call = (body: unknown, headers: Record<string, string> = { origin: 'https://gitranks.com' }) =>
  POST(
    new NextRequest('https://gitranks.com/api/unsung-hero/hit', {
      method: 'POST',
      headers: { 'cf-connecting-ip': '203.0.113.7', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

/** What the API was sent: its path, body and the signed caller (source, login, email). */
const sent = () => {
  const [path, init, source, login, email] = signedFetch.mock.calls[0] as [string, RequestInit, ...unknown[]];
  return { path, method: init.method, body: JSON.parse(String(init.body)), source, login, email };
};

describe('POST /api/unsung-hero/hit', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    requestMaySeePackages.mockReset().mockResolvedValue(true);
    sessionTokenOf.mockReset().mockResolvedValue(null);
    signedFetch.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  });

  it('answers the not-found answer to a visitor the feature is hidden from, passing nothing on', async () => {
    requestMaySeePackages.mockResolvedValue(false);
    const response = await call(visit);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('refuses a hit sent from another site, before asking the gate', async () => {
    expect((await call(visit, { origin: 'https://evil.example' })).status).toBe(403);
    expect(requestMaySeePackages).not.toHaveBeenCalled();
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['no body', ''],
    ['a body that is not JSON', '{'],
    ['another kind', { kind: 'star', repo: visit.repo }],
    ['no repository', { kind: 'visit' }],
    ['a repository that is not owner/name', { kind: 'github', repo: 'scroll-guard' }],
    ['a repository with a path in it', { kind: 'visit', repo: 'octo-labs/scroll-guard/issues' }],
    ['an owner over 39 characters', { kind: 'visit', repo: `${'a'.repeat(40)}/x` }],
    ['a body over 1,000 characters', { ...visit, pad: 'x'.repeat(1_000) }],
  ])('refuses %s and passes nothing on', async (_name, body) => {
    const response = await call(body);

    expect(response.status).toBe(400);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it("passes a visitor's hit on with their address alone, signed as the site's visitor", async () => {
    const response = await call({ ...visit, visitorAddress: '198.51.100.1', githubLogin: 'someone-else' });

    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(sent()).toEqual({
      path: '/unsung-hero/hit',
      method: 'POST',
      body: { kind: 'visit', repo: 'octo-labs/scroll-guard', visitorAddress: '203.0.113.7' },
      source: 'client',
      login: undefined,
      email: undefined,
    });
  });

  it('names a signed-in viewer from the session, so the API can tell whether the feature is open to them', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    await call({ kind: 'github', repo: visit.repo });

    expect(sent()).toMatchObject({
      body: { kind: 'github', repo: visit.repo, visitorAddress: '203.0.113.7' },
      source: 'client',
      login: 'octocat',
      email: 'octo@example.com',
    });
  });

  it('leaves the address out when the request has none', async () => {
    await call(visit, { origin: 'https://gitranks.com', 'cf-connecting-ip': '' });

    expect(sent().body).toEqual({ kind: 'visit', repo: visit.repo });
  });

  it('answers 204 when the API fails or does not answer: a count lost is not an error', async () => {
    signedFetch.mockRejectedValue(new Error('down'));
    expect((await call(visit)).status).toBe(204);

    signedFetch.mockResolvedValue(new Response('boom', { status: 500 }));
    expect((await call(visit)).status).toBe(204);
  });
});
