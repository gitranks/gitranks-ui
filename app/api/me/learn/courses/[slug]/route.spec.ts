import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const get = (slug: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/courses/${slug}`), { params: Promise.resolve({ slug }) });
const course = {
  slug: 'algorithms',
  lessons: [
    { slug: 'sets', depth: 'LEARNED', known: false, due: true },
    { slug: 'maps', depth: 'NONE', known: false, due: false },
  ],
};

describe("a course's personal side", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get('algorithms');
    expect(await res.json()).toEqual({ course: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers each lesson's depth for the signed-in person, and nothing on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ learnCourseMine: course });
    expect(await (await get('algorithms')).json()).toEqual({ course });
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnCourseMineDocument,
      { slug: 'algorithms' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('algorithms')).json()).toEqual({ course: null });
  });
});
