import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
const { myProgress, myProgressWithFixes } = await import('@/lib/learn/__fixtures__/my-progress');
const { LearnMyProgressDocument, LearnMyProgressFixesDocument } = await import('@/lib/learn/my-progress.documents');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/progress'));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};
/**
 * The three reads: the progress, the person's saved zone (the Email rows of Settings), and what the days gain from real
 * fixes (none unless given).
 */
function answers(
  progress: () => Promise<unknown>,
  zone: () => Promise<unknown>,
  fixes: () => Promise<unknown> = async () => ({ learnMyProgress: null }),
) {
  graphqlDirect.mockImplementation((document: unknown) =>
    document === LearnMyProgressDocument ? progress() : document === LearnMyProgressFixesDocument ? fixes() : zone(),
  );
}
const callOf = (document: unknown) => graphqlDirect.mock.calls.find(([each]) => each === document);
const zoneOf = (timeZone: string | null) => async () => ({
  contributeEmailSettings: { to: null, needsYou: 'NEVER', ended: false, timeZone },
});

describe("My progress's route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
    // 03:30 UTC on Sunday 22 Nov: still Saturday in New York, already Sunday in Tokyo.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T03:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('answers signed out without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ progress: null, today: null, signedOut: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers signed out for a session that needs a new sign-in', async () => {
    signIn('RefreshTokenError');
    expect(await (await get()).json()).toEqual({ progress: null, today: null, signedOut: true });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the person's own progress, with today in the zone the API counts their days in", async () => {
    signIn();
    answers(async () => ({ learnMyProgress: myProgress }), zoneOf('Asia/Tokyo'));
    const res = await get();
    expect(await res.json()).toEqual({ progress: myProgress, today: '2026-11-22', signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(callOf(LearnMyProgressDocument)?.[2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    // The read of real fixes is its own, with a time limit.
    expect(callOf(LearnMyProgressFixesDocument)?.[2]).toEqual({
      source: 'ssr',
      githubLogin: 'octocat',
      signal: expect.any(AbortSignal),
    });
  });

  it("adds the days' fixes merged and walkthroughs passed when they come, and draws the days without them when not", async () => {
    signIn();
    const days = myProgressWithFixes.days.filter((day) => day.fixesMerged || day.walkthroughs);
    const fixes = async () => ({ learnMyProgress: { days } });
    answers(async () => ({ learnMyProgress: myProgress }), zoneOf('Asia/Tokyo'), fixes);
    expect((await (await get()).json()).progress).toEqual(myProgressWithFixes);
    for (const failed of [
      async () => {
        throw new Error('Cannot query field "fixesMerged"');
      },
      async () => ({ learnMyProgress: { days: null } }),
    ]) {
      answers(async () => ({ learnMyProgress: myProgress }), zoneOf('Asia/Tokyo'), failed);
      expect((await (await get()).json()).progress).toEqual(myProgress);
    }
  });

  it("counts today in Learn's default zone with no zone saved, or one that is not a real zone", async () => {
    signIn();
    answers(async () => ({ learnMyProgress: myProgress }), zoneOf(null));
    expect((await (await get()).json()).today).toBe('2026-11-21');
    answers(async () => ({ learnMyProgress: myProgress }), zoneOf('Mars/Olympus'));
    expect((await (await get()).json()).today).toBe('2026-11-21');
  });

  it('has no today when the zone cannot be read, and the progress still comes', async () => {
    signIn();
    answers(
      async () => ({ learnMyProgress: myProgress }),
      async () => ({ contributeEmailSettings: null }),
    );
    expect(await (await get()).json()).toEqual({ progress: myProgress, today: null, signedOut: false });
    answers(
      async () => ({ learnMyProgress: myProgress }),
      async () => {
        throw new Error('down');
      },
    );
    expect(await (await get()).json()).toEqual({ progress: myProgress, today: null, signedOut: false });
  });

  it('answers none when Learn is not open to them, the answer is odd or the API fails', async () => {
    signIn();
    for (const progress of [
      async () => ({ learnMyProgress: null }),
      async () => ({ learnMyProgress: { ...myProgress, days: null } }),
      async () => ({ learnMyProgress: { ...myProgress, learned: '105' } }),
      async () => {
        throw new Error('down');
      },
    ]) {
      answers(progress, zoneOf('Asia/Tokyo'));
      expect(await (await get()).json()).toEqual({ progress: null, today: null, signedOut: false });
    }
  });
});
