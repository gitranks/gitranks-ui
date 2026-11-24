import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { OwnProfilePicksMaskedDocument } = await import('@/lib/contribute/profile-picks.data');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

const get = (login?: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/contribute/profile-block${login ? `?login=${login}` : ''}`));

const signIn = (githubLogin: string) => {
  current.session = { user: { githubLogin }, expires: '2099-01-01T00:00:00.000Z' };
};

const pick = (n: number) => ({ repo: 'o/r', number: n, fit: 'language' });
const STATS = { screenedRepos: 1, issuesRead: 2, readyIssues: 3 };

describe("the owner's profile block route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers none to anyone but the signed-in owner, without asking the API', async () => {
    expect(await (await get('octocat')).json()).toEqual({ kind: 'none' });
    signIn('someone');
    const response = await get('octocat');
    expect(await response.json()).toEqual({ kind: 'none' });
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers the owner their own picks before they connect, at most three', async () => {
    signIn('OctoCat');
    graphqlDirect.mockResolvedValueOnce({
      ownProfilePicks: { contributor: false, items: [1, 2, 3, 4].map(pick), stats: STATS },
    });
    expect(await (await get('octocat')).json()).toEqual({ kind: 'own', issues: [1, 2, 3].map(pick), stats: STATS });
    expect(graphqlDirect).toHaveBeenCalledWith(
      OwnProfilePicksMaskedDocument,
      { login: 'OctoCat' },
      { source: 'client', githubLogin: 'OctoCat' },
    );
  });

  it('answers a contributor the top of their own list, in one call', async () => {
    signIn('octocat');
    graphqlDirect.mockResolvedValueOnce({
      ownProfilePicks: { contributor: true, items: [1, 2].map(pick), stats: null },
    });
    expect(await (await get('octocat')).json()).toEqual({ kind: 'contributor', issues: [1, 2].map(pick) });
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });

  it('answers none when there is nothing to show, or the API fails', async () => {
    signIn('octocat');
    graphqlDirect.mockResolvedValueOnce({ ownProfilePicks: { contributor: false, items: [], stats: null } });
    expect(await (await get('octocat')).json()).toEqual({ kind: 'none' });
    graphqlDirect.mockRejectedValueOnce(new Error('502'));
    expect(await (await get('octocat')).json()).toEqual({ kind: 'none' });
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
  });

  it('sends the browser nothing that names a masked pick, whatever the API sent beside its masked form', async () => {
    signIn('octocat');
    const leaky = {
      repo: 'secret-org/secret-repo',
      number: 4242,
      url: 'https://github.com/secret-org/secret-repo/issues/4242',
      title: 'Secret title of the real issue',
      labels: ['secret-label'],
      why: ['secret reason'],
      fit: 'language',
      masked: maskedIssue(),
    };
    graphqlDirect.mockResolvedValueOnce({ ownProfilePicks: { contributor: false, items: [leaky], stats: STATS } });
    const sent = await (await get('octocat')).text();
    for (const secret of ['secret', '4242']) expect(sent).not.toContain(secret);
    expect(JSON.parse(sent).issues[0].masked).toEqual(maskedIssue());
  });

  it('answers the masked picks, and a named one as it came', async () => {
    signIn('octocat');
    const masked = { ...pick(1), masked: maskedIssue() };
    graphqlDirect.mockResolvedValueOnce({ ownProfilePicks: { contributor: true, items: [masked], stats: null } });
    expect(await (await get('octocat')).json()).toEqual({
      kind: 'contributor',
      issues: [
        {
          ...masked,
          repo: null,
          number: null,
          url: null,
          title: null,
          labels: null,
          why: null,
        },
      ],
    });

    const named = { ...pick(2), masked: null };
    graphqlDirect.mockResolvedValueOnce({ ownProfilePicks: { contributor: true, items: [named], stats: null } });
    expect(await (await get('octocat')).json()).toEqual({ kind: 'contributor', issues: [named] });
    expect(graphqlDirect.mock.calls.map(([document]) => document)).toEqual([
      OwnProfilePicksMaskedDocument,
      OwnProfilePicksMaskedDocument,
    ]);
  });
});
