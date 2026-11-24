import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
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
vi.mock('@/lib/learn/issues.data', () => ({ fixesCached: vi.fn() }));
vi.mock('server-only', () => ({}));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { myFixes } = await import('@/lib/learn/__fixtures__/my-progress');
const { LearnMyFixesDocument, LearnProgressIssuesDocument } = await import('@/lib/learn/my-progress.documents');

const NO_END = { openIssues: null, email: null };
const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/progress/fixes'));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};
/** The two reads: the fixes, and what the empty end needs. */
function answers(fixes: () => Promise<unknown>, end: () => Promise<unknown> = async () => ({ learnHome: null })) {
  graphqlDirect.mockImplementation((document: unknown) => (document === LearnMyFixesDocument ? fixes() : end()));
}
const askedFor = (document: unknown) => graphqlDirect.mock.calls.filter(([each]) => each === document);

describe('the route of "Your fixes"', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers signed out without asking the API, also for a session that needs a new sign-in, never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ fixes: null, end: null, signedOut: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    signIn('RefreshTokenError');
    expect(await (await get()).json()).toEqual({ fixes: null, end: null, signedOut: true });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the person's own fixes, read with a time limit, and asks nothing more when there are some", async () => {
    signIn();
    answers(async () => ({ learnMyFixes: myFixes }));
    const res = await get();
    expect(await res.json()).toEqual({ fixes: myFixes, end: NO_END, signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(askedFor(LearnMyFixesDocument)[0][2]).toEqual({
      source: 'ssr',
      githubLogin: 'octocat',
      signal: expect.any(AbortSignal),
    });
    expect(askedFor(LearnProgressIssuesDocument)).toHaveLength(0);
  });

  it('with none, answers the open issues that fit and the email of their list, and none of either on a failure', async () => {
    signIn();
    answers(
      async () => ({ learnMyFixes: [] }),
      async () => ({
        learnHome: { thirdBox: { openIssues: 12 }, issues: { emailOn: true, emailTo: 'mona@example.com' } },
      }),
    );
    expect(await (await get()).json()).toEqual({
      fixes: [],
      end: { openIssues: 12, email: { emailOn: true, emailTo: 'mona@example.com' } },
      signedOut: false,
    });
    answers(
      async () => ({ learnMyFixes: [] }),
      async () => ({ learnHome: { thirdBox: { openIssues: 0 }, issues: { emailOn: 'yes' } } }),
    );
    expect((await (await get()).json()).end).toEqual(NO_END);
    answers(
      async () => ({ learnMyFixes: [] }),
      async () => {
        throw new Error('down');
      },
    );
    expect((await (await get()).json()).end).toEqual(NO_END);
  });

  it('answers no fixes when Learn is not open to them, the API does not know the read yet, or it fails', async () => {
    signIn();
    for (const fixes of [
      async () => ({ learnMyFixes: null }),
      async () => {
        throw new Error('Cannot query field "learnMyFixes"');
      },
    ]) {
      answers(fixes);
      expect(await (await get()).json()).toEqual({ fixes: null, end: NO_END, signedOut: false });
    }
  });
});
