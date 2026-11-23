import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCoursesMine, current } = vi.hoisted(() => ({
  loadLearnCoursesMine: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCoursesMine }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { coursesMine, lessonDepths } = await import('@/lib/learn/__fixtures__/course');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/courses'));

describe("the person's side of all courses", () => {
  beforeEach(() => {
    loadLearnCoursesMine.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ mine: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnCoursesMine).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's courses and depths as read", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    loadLearnCoursesMine.mockResolvedValueOnce({ courses: coursesMine, depths: lessonDepths });
    const res = await get();
    expect(await res.json()).toEqual({ mine: { courses: coursesMine, depths: lessonDepths } });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnCoursesMine).toHaveBeenCalledWith('octocat');
    loadLearnCoursesMine.mockResolvedValueOnce(null);
    expect(await (await get()).json()).toEqual({ mine: null });
  });

  it('asks nothing for a session that failed', async () => {
    current.session = { user: { githubLogin: 'octocat' }, error: 'RefreshFailed' } as unknown as Session;
    expect(await (await get()).json()).toEqual({ mine: null });
    expect(loadLearnCoursesMine).not.toHaveBeenCalled();
  });
});
