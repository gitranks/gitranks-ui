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
vi.mock('server-only', () => ({}));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/bar'));
const bar = { setup: 'SAVED', due: 6, pullRequests: true, pullRequestsNeedYou: 1 };

describe("Learn's bar route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers no bar signed out, without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ bar: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  /** The API's answers by the query's name: the bar, and the two signs read apart. */
  const answer = (answers: { LearnBar?: unknown; ContributeSigns?: unknown }) =>
    graphqlDirect.mockImplementation(async (doc: { definitions: { name?: { value: string } }[] }) => {
      const name = doc.definitions[0].name?.value as keyof typeof answers;
      const value = answers[name];
      if (value instanceof Error) throw value;
      return value;
    });
  const signs = (learnOnboardedAt: string | null) => ({
    contribute: { contributor: { contributeOnboardedAt: null, learnOnboardedAt } },
  });

  it("answers the API's bar for the signed-in person with the Learn sign, and none when the API fails", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answer({ LearnBar: { learnBar: bar }, ContributeSigns: signs('2026-11-25T10:00:00.000Z') });
    expect(await (await get()).json()).toEqual({ bar: { ...bar, onboarded: true } });
    for (const call of graphqlDirect.mock.calls) expect(call[2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    answer({ LearnBar: { learnBar: bar }, ContributeSigns: signs(null) });
    expect(await (await get()).json()).toEqual({ bar: { ...bar, onboarded: false } });

    answer({ LearnBar: { learnBar: null }, ContributeSigns: signs(null) });
    expect(await (await get()).json()).toEqual({ bar: null });

    answer({ LearnBar: new Error('down'), ContributeSigns: signs(null) });
    expect(await (await get()).json()).toEqual({ bar: null });
  });

  it('answers the bar with the sign not known when the sign cannot be read', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    answer({ LearnBar: { learnBar: bar }, ContributeSigns: new Error('down') });
    expect(await (await get()).json()).toEqual({ bar: { ...bar, onboarded: null } });
    answer({ LearnBar: { learnBar: bar }, ContributeSigns: { contribute: null } });
    expect(await (await get()).json()).toEqual({ bar: { ...bar, onboarded: null } });
  });
});
