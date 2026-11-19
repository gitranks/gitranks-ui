import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/session-token', () => ({ sessionTokenOf }));

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

  it('answers closed signed out until public, asking only whether it is public, never kept by any cache', async () => {
    sessionTokenOf.mockResolvedValue(null);
    graphqlDirect.mockResolvedValueOnce(gate(false));
    const res = await get();

    expect(await res.json()).toEqual({ open: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
  });

  it('answers open signed out once public, without reading the session', async () => {
    graphqlDirect.mockResolvedValueOnce(gate(true));
    const res = await get();

    expect(await res.json()).toEqual({ open: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(sessionTokenOf).not.toHaveBeenCalled();
  });

  it('answers closed for a session that needs a new sign-in until public, without asking for the viewer', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', error: 'RefreshTokenError' });
    graphqlDirect.mockResolvedValueOnce(gate(false));
    expect(await (await get()).json()).toEqual({ open: false });
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });

  it("answers what the API says of the signed-in viewer, asked with the session's login and email", async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
    graphqlDirect.mockResolvedValueOnce(gate(false)).mockResolvedValueOnce(gate(false, true));

    const res = await get();
    expect(await res.json()).toEqual({ open: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
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
