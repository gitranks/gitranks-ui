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

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { IssuesForProfileDocument } = await import('@/lib/contribute/contribute.documents');

const get = (login?: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/contribute/issues${login ? `?login=${login}` : ''}`));

const signIn = (githubLogin: string, error?: string) => {
  current.session = { user: { githubLogin }, error, expires: '2099-01-01T00:00:00.000Z' };
};

const issue = (n: number) => ({ issueId: `I_${n}`, nameWithOwner: 'fern-lang/fern', number: n });

describe('the profile block route', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it.each([
    ['a visitor without a session', () => {}, 'octocat'],
    ['a signed-in viewer on another profile', () => signIn('someone'), 'octocat'],
    ['a session that needs a new sign-in', () => signIn('octocat', 'RefreshTokenError'), 'octocat'],
    ['a request without a login', () => signIn('octocat'), undefined],
  ])('answers no issues to %s without asking the API', async (_, setUp, login) => {
    setUp();
    const response = await get(login);

    expect(await response.json()).toEqual({ issues: [] });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("asks for the owner's own issues, as the owner, and gives at most three", async () => {
    signIn('OctoCat');
    graphqlDirect.mockResolvedValueOnce({ issuesForProfile: [1, 2, 3, 4].map(issue) });

    const response = await get('octocat');

    expect(await response.json()).toEqual({ issues: [1, 2, 3].map(issue) });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).toHaveBeenCalledWith(
      IssuesForProfileDocument,
      { login: 'OctoCat' },
      { source: 'client', githubLogin: 'OctoCat' },
    );
  });

  it('answers no issues when the API fails, so the profile shows no block', async () => {
    signIn('octocat');
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));

    expect(await (await get('octocat')).json()).toEqual({ issues: [] });
  });
});
