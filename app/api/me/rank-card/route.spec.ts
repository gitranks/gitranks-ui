import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, fetchGlobalTiers, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  fetchGlobalTiers: vi.fn(async () => null),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/app/components/landing/landing-data', () => ({ fetchGlobalTiers }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };

const get = (login?: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/rank-card${login === undefined ? '' : `?login=${login}`}`));

const signIn = (githubLogin: string) => {
  current.session = { user: { githubLogin }, expires: '2099-01-01T00:00:00.000Z' };
};

const ranked = (login: string) => ({
  globalRankByLogin: { s: 1, sM: 2, c: null, cM: null, f: null, fM: null, user: { login, s: 10, c: 0, f: 0 } },
});

describe('the rank card route', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('refuses a visitor without a session, without asking the API', async () => {
    const response = await get('octocat');

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it.each([
    ['no login', undefined],
    ['another login', 'someone'],
  ])('refuses %s in the url, without asking the API', async (_, login) => {
    signIn('octocat');
    const response = await get(login);

    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the session's own card at its own login, in any case", async () => {
    signIn('OctoCat');
    graphqlDirect.mockResolvedValueOnce(ranked('OctoCat'));

    const response = await get('octocat');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
    expect((await response.json()).login).toBe('OctoCat');
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything(), { login: 'OctoCat' });
  });

  it('never lets the browser keep a failed read', async () => {
    signIn('octocat');
    graphqlDirect.mockRejectedValueOnce(new Error('down'));

    const response = await get('octocat');

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('answers 404 for a session that is not ranked', async () => {
    signIn('newcomer');
    graphqlDirect.mockResolvedValueOnce({ globalRankByLogin: null });

    const response = await get('newcomer');

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300');
  });
});
