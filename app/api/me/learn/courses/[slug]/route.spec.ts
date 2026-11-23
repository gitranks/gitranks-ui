import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { freshMine, progressMine } from '@/lib/learn/__fixtures__/course';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Context = { params: Promise<{ slug: string }> };
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
const { LearnCourseMineDocument } = await import('@/lib/learn/lesson-page.documents');
const { LearnSetupLevelDocument } = await import('@/lib/learn/course.documents');

const get = (slug: string, query = '') =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/courses/${slug}${query}`), {
    params: Promise.resolve({ slug }),
  });
const signIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};

describe("a course's personal side", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get('algorithms');
    expect(await res.json()).toEqual({ course: null, checkFirst: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's side whole, and nothing on a failure", async () => {
    signIn();
    graphqlDirect.mockResolvedValueOnce({ learnCourseMine: progressMine });
    expect(await (await get('algorithms')).json()).toEqual({ course: progressMine, checkFirst: false });
    // A course already started never asks for the level.
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnCourseMineDocument,
      { slug: 'algorithms' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('algorithms')).json()).toEqual({ course: null, checkFirst: false });
  });

  it("never reads the level for a lesson's page, which does not ask whether the check leads", async () => {
    signIn();
    graphqlDirect.mockResolvedValueOnce({ learnCourseMine: freshMine });
    expect(await (await get('algorithms')).json()).toEqual({ course: freshMine, checkFirst: false });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).not.toHaveBeenCalledWith(LearnSetupLevelDocument, expect.anything(), expect.anything());
  });

  it('puts the check first, when asked, on a course not started, for an experienced developer only', async () => {
    signIn();
    for (const [level, checkFirst] of [
      [3, true],
      [2, false],
      [null, false],
    ] as const) {
      graphqlDirect.mockResolvedValueOnce({ learnCourseMine: freshMine });
      graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: level === null ? null : { level } });
      expect(await (await get('algorithms', '?check=1')).json()).toEqual({ course: freshMine, checkFirst });
    }
    expect(graphqlDirect).toHaveBeenCalledWith(LearnSetupLevelDocument, {}, { source: 'ssr', githubLogin: 'octocat' });
    // A level that cannot be read leaves the first lesson first.
    graphqlDirect.mockResolvedValueOnce({ learnCourseMine: freshMine });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('algorithms', '?check=1')).json()).toEqual({ course: freshMine, checkFirst: false });
  });
});
