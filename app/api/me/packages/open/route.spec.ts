import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));

const { GET } = await import('./route');
const { resetPackagesGate } = await import('@/lib/packages/packages-gate');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/packages/open'));
const gate = (everyone: boolean, viewer = false) => ({ packagesGate: { everyone, viewer } });

describe('the packages open route', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
    resetPackagesGate();
  });

  it('answers closed signed out, without asking the API, never kept by a shared cache', async () => {
    sessionTokenOf.mockResolvedValue(null);
    const res = await get();

    expect(await res.json()).toEqual({ open: false });
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers closed for a session that needs a new sign-in, without asking the API', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', error: 'RefreshTokenError' });
    expect(await (await get()).json()).toEqual({ open: false });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers what the API says of the signed-in viewer, asked with the session's login and email", async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    graphqlDirect.mockResolvedValueOnce(gate(false)).mockResolvedValueOnce(gate(false, true));

    const res = await get();
    expect(await res.json()).toEqual({ open: true });
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
    expect(graphqlDirect.mock.calls[1][2]).toEqual({
      source: 'ssr',
      githubLogin: 'octocat',
      accountEmail: 'octo@example.com',
    });
  });

  it('answers open to a signed-in viewer once public, and closed when the API fails', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce(gate(true));
    expect(await (await get()).json()).toEqual({ open: true });

    resetPackagesGate();
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502'));
    expect(await (await get()).json()).toEqual({ open: false });
  });
});
