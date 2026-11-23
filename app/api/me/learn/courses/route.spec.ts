import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCoursesMine, loadLearnCourseDepths, current } = vi.hoisted(() => ({
  loadLearnCoursesMine: vi.fn(),
  loadLearnCourseDepths: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/learn/course.data', () => ({ COURSE_DEPTHS_MAX: 3, loadLearnCoursesMine, loadLearnCourseDepths }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { coursesMine, lessonDepths } = await import('@/lib/learn/__fixtures__/course');

const get = (query = '') => GET(new NextRequest(`https://gitranks.com/api/me/learn/courses${query}`));
const signIn = () => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
};

describe("the person's side of all courses", () => {
  beforeEach(() => {
    loadLearnCoursesMine.mockReset();
    loadLearnCourseDepths.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking, and is never kept', async () => {
    for (const query of ['', '?depths=algorithms']) {
      const res = await get(query);
      expect(await res.json()).toEqual(query ? { depths: null } : { mine: null });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadLearnCoursesMine).not.toHaveBeenCalled();
    expect(loadLearnCourseDepths).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's courses alone, never the depths", async () => {
    signIn();
    loadLearnCoursesMine.mockResolvedValueOnce(coursesMine);
    const res = await get();
    expect(await res.json()).toEqual({ mine: coursesMine });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnCoursesMine).toHaveBeenCalledWith('octocat');
    expect(loadLearnCourseDepths).not.toHaveBeenCalled();
    loadLearnCoursesMine.mockResolvedValueOnce(null);
    expect(await (await get()).json()).toEqual({ mine: null });
  });

  it('answers the depths of the courses asked, each a slug once, no more than the cap', async () => {
    signIn();
    loadLearnCourseDepths.mockResolvedValue(lessonDepths);
    const res = await get('?depths=algorithms,go,go,Not%20A%20Slug,php,rust');
    expect(await res.json()).toEqual({ depths: lessonDepths });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnCourseDepths).toHaveBeenCalledWith('octocat', ['algorithms', 'go', 'php']);
    expect(loadLearnCoursesMine).not.toHaveBeenCalled();
    // Nothing of a slug's shape: nothing asked.
    expect(await (await get('?depths=')).json()).toEqual({ depths: null });
    expect(loadLearnCourseDepths).toHaveBeenCalledTimes(1);
  });

  it('asks nothing for a session that failed', async () => {
    current.session = { user: { githubLogin: 'octocat' }, error: 'RefreshFailed' } as unknown as Session;
    expect(await (await get()).json()).toEqual({ mine: null });
    expect(loadLearnCoursesMine).not.toHaveBeenCalled();
  });
});
