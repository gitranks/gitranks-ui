import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Params = { owner: string; repo: string; number: string };
type Context = { params: Promise<Params> };
type Handler = (req: NextRequest & { auth: Session | null }, context: Context) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, context: Context) => {
    req.auth = current.session;
    return handler(req, context);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};
const { LearnFixMineDocument, LearnMyWalkthroughAnswersDocument } = await import('@/lib/learn/walkthrough.documents');

const get = (number = '57', query = '') =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/fixes/acme/widgets/${number}${query}`), {
    params: Promise.resolve({ owner: 'acme', repo: 'widgets', number }),
  });
const signIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};
const ref = { owner: 'acme', repo: 'widgets', number: 57 };
const as = { source: 'ssr', githubLogin: 'octocat' };

describe("a fix's personal side", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ mine: null, answers: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the person's side as that person, and with ?answers=1 the fixer's own answers", async () => {
    signIn();
    graphqlDirect.mockImplementation(async (document: unknown) =>
      document === LearnFixMineDocument
        ? { learnFixMine: { fixer: true, walkthroughHeld: false, passedAt: null, similar: [] } }
        : { learnMyWalkthroughAnswers: { login: 'octocat', shared: false, passedAt: null, answers: [] } },
    );
    const plain = await (await get()).json();
    expect(plain).toEqual({ mine: { fixer: true, held: false, passedAt: null, similar: null }, answers: null });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    const both = await (await get('57', '?answers=1')).json();
    expect(both.answers).toMatchObject({ login: 'octocat', shared: false });
    expect(graphqlDirect).toHaveBeenCalledWith(LearnMyWalkthroughAnswersDocument, { ref }, as);
    expect(graphqlDirect).toHaveBeenCalledWith(LearnFixMineDocument, { ref }, as);
  });

  it('answers nothing on a failure, and for an address that names no pull request', async () => {
    signIn();
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await (await get()).json()).toEqual({ mine: null, answers: null });
    graphqlDirect.mockClear();
    expect(await (await get('x1')).json()).toEqual({ mine: null, answers: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
