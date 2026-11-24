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
const { historyFirst, historyWithFixes } = await import('@/lib/learn/__fixtures__/my-progress');
const { LearnHistoryDocument, LearnHistoryFixesDocument } = await import('@/lib/learn/my-progress.documents');

/** The two reads: the page of History, and what its days gain from real fixes (none unless given). */
function answers(
  history: () => Promise<unknown>,
  fixes: () => Promise<unknown> = async () => ({ learnHistory: null }),
) {
  graphqlDirect.mockImplementation((document: unknown) => (document === LearnHistoryDocument ? history() : fixes()));
}
const callsOf = (document: unknown) => graphqlDirect.mock.calls.filter(([each]) => each === document);

const get = (query = '') => GET(new NextRequest(`https://gitranks.com/api/me/learn/progress/history${query}`));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};

describe("History's route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers signed out without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ history: null, signedOut: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    signIn('RefreshTokenError');
    expect(await (await get('?before=2026-11-20')).json()).toEqual({ history: null, signedOut: true });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('refuses a day that is not a date with 400, without asking the API', async () => {
    signIn();
    for (const before of ['yesterday', '2026-02-30', '2026-11-2', '2026-11-20T00:00']) {
      const res = await get(`?before=${encodeURIComponent(before)}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ history: null, signedOut: false });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers the newest days, or the days before a date, for the person alone', async () => {
    signIn();
    answers(async () => ({ learnHistory: historyFirst }));
    const res = await get();
    expect(await res.json()).toEqual({ history: historyFirst, signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(callsOf(LearnHistoryDocument)[0].slice(1)).toEqual([
      { before: null },
      { source: 'ssr', githubLogin: 'octocat' },
    ]);

    await get('?before=2026-11-12');
    expect(callsOf(LearnHistoryDocument)[1][1]).toEqual({ before: '2026-11-12' });
    expect(callsOf(LearnHistoryFixesDocument).map((call) => call[1])).toEqual([
      { before: null },
      { before: '2026-11-12' },
    ]);
    expect(callsOf(LearnHistoryFixesDocument)[0][2]).toMatchObject({ signal: expect.any(AbortSignal) });
  });

  it("adds each day's fixes merged and walkthroughs passed when they come, and the days alone when not", async () => {
    signIn();
    const days = historyWithFixes.days.filter((day) => day.fixesMerged);
    answers(
      async () => ({ learnHistory: historyFirst }),
      async () => ({ learnHistory: { days } }),
    );
    expect((await (await get()).json()).history).toEqual({ days: historyWithFixes.days, more: true });
    answers(
      async () => ({ learnHistory: historyFirst }),
      async () => {
        throw new Error('down');
      },
    );
    expect((await (await get()).json()).history).toEqual(historyFirst);
  });

  it('answers none when Learn is not open to them, the answer is odd or the API fails', async () => {
    signIn();
    answers(async () => ({ learnHistory: null }));
    expect(await (await get()).json()).toEqual({ history: null, signedOut: false });
    answers(async () => ({ learnHistory: { days: historyFirst.days } }));
    expect(await (await get()).json()).toEqual({ history: null, signedOut: false });
    graphqlDirect.mockReset().mockRejectedValue(new Error('down'));
    expect(await (await get()).json()).toEqual({ history: null, signedOut: false });
  });
});
