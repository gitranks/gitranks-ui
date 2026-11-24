import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, fixesCached, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  fixesCached: vi.fn(),
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
vi.mock('@/lib/learn/issues.data', () => ({ fixesCached }));
vi.mock('server-only', () => ({}));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { myWalkthroughs } = await import('@/lib/learn/__fixtures__/my-progress');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/progress/walkthroughs'));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};
/** The API's answer for a walkthrough row, as `myWalkthroughs` reads it. */
const answered = myWalkthroughs.map(({ passedAt, ...fix }) => ({ fix, passedAt }));

describe('the route of "Walkthroughs"', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    fixesCached.mockReset();
    current.session = null;
  });

  it('answers signed out without asking the API, also for a session that needs a new sign-in, never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ walkthroughs: null, fixes: null, signedOut: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    signIn('RefreshTokenError');
    expect(await (await get()).json()).toEqual({ walkthroughs: null, fixes: null, signedOut: true });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers the walkthroughs the person passed, newest first, read with a time limit', async () => {
    signIn();
    graphqlDirect.mockResolvedValue({ learnMyWalkthroughs: [...answered].reverse() });
    const res = await get();
    expect(await res.json()).toEqual({ walkthroughs: myWalkthroughs, fixes: null, signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({
      source: 'ssr',
      githubLogin: 'octocat',
      signal: expect.any(AbortSignal),
    });
    expect(fixesCached).not.toHaveBeenCalled();
  });

  it('with none, answers how many merged fixes have a walkthrough, and none for zero or a failure', async () => {
    signIn();
    graphqlDirect.mockResolvedValue({ learnMyWalkthroughs: [] });
    fixesCached.mockResolvedValueOnce({ total: 5 });
    expect(await (await get()).json()).toEqual({ walkthroughs: [], fixes: 5, signedOut: false });
    fixesCached.mockResolvedValueOnce({ total: 0 });
    expect((await (await get()).json()).fixes).toBeNull();
    fixesCached.mockRejectedValueOnce(new Error('down'));
    expect((await (await get()).json()).fixes).toBeNull();
  });

  it('answers no walkthroughs when Learn is not open to them, the API does not know the read yet, or it fails', async () => {
    signIn();
    graphqlDirect.mockResolvedValueOnce({ learnMyWalkthroughs: null });
    expect(await (await get()).json()).toEqual({ walkthroughs: null, fixes: null, signedOut: false });
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "learnMyWalkthroughs"'));
    expect(await (await get()).json()).toEqual({ walkthroughs: null, fixes: null, signedOut: false });
  });
});
