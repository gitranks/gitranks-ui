import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { load, current } = vi.hoisted(() => ({
  load: vi.fn(),
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
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/real-issues.data', () => ({ loadLessonRealMine: load }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};
const { NO_LESSON_REAL } = await import('@/lib/learn/real-issues');
const { lessonRealIssues } = await import('@/lib/learn/__fixtures__/real-issues');

const get = (slug: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/lessons/${slug}/real-world`), {
    params: Promise.resolve({ slug }),
  });

describe('"In the real world" for the person', () => {
  beforeEach(() => {
    load.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get('a-hash-map');
    expect(await res.json()).toEqual(NO_LESSON_REAL);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(load).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's parts, and nothing on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    load.mockResolvedValueOnce(lessonRealIssues);
    expect(await (await get('a-hash-map')).json()).toEqual(lessonRealIssues);
    expect(load).toHaveBeenCalledWith('a-hash-map', 'octocat');
    load.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('a-hash-map')).json()).toEqual(NO_LESSON_REAL);
  });
});
