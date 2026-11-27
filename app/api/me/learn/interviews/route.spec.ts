import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { current, interviewsOpenWithin, loadInterviewsForCourses, loadLearnCourse } = vi.hoisted(() => ({
  current: { session: null as Session | null },
  interviewsOpenWithin: vi.fn(),
  loadInterviewsForCourses: vi.fn(),
  loadLearnCourse: vi.fn(),
}));

type Handler = (req: NextRequest & { auth: Session | null }, ctx: unknown) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, ctx: unknown) => {
    req.auth = current.session;
    return handler(req, ctx);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/interviews/interviews-gate', () => ({ interviewsOpenWithin }));
vi.mock('@/lib/interviews/learn.data', () => ({ loadInterviewsForCourses }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse }));

type Route = (req: NextRequest, ctx?: unknown) => Promise<Response>;
const { GET } = (await import('./route')) as unknown as { GET: Route };
const { forCourses } = await import('@/lib/interviews/__fixtures__/learn');
const { coursesInterviews, interviewSkillsCard, northwindCourseCard } = await import(
  '@/components/interviews/learn-gate/__fixtures__/courses'
);
const { algorithmsCourse } = await import('@/lib/learn/__fixtures__/course');

const get = () => new NextRequest('https://gitranks.com/api/me/learn/interviews');
const signedIn = (extra: object = {}) =>
  ({ user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', ...extra }) as unknown as Session;
/** A course whole, as the read by its slug answers it: the card and more. */
const whole = (card: object) => ({ ...algorithmsCourse, ...card });

beforeEach(() => {
  current.session = null;
  interviewsOpenWithin.mockReset().mockResolvedValue(true);
  loadInterviewsForCourses.mockReset().mockResolvedValue(forCourses);
  loadLearnCourse
    .mockReset()
    .mockImplementation(async (slug: string) =>
      slug === 'interview-skills'
        ? whole(interviewSkillsCard)
        : slug === 'interviewing-at-northwind'
          ? whole(northwindCourseCard)
          : null,
    );
});

describe('/api/me/learn/interviews', () => {
  it('is null signed out, without asking the API, and never kept', async () => {
    const response = await GET(get());
    expect(await response.json()).toEqual({ interviews: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(interviewsOpenWithin).not.toHaveBeenCalled();
    expect(loadInterviewsForCourses).not.toHaveBeenCalled();
  });

  it('is null for a session that needs a new sign-in, and for a person Interviews is not open to', async () => {
    current.session = signedIn({ error: 'RefreshTokenError' });
    expect(await (await GET(get())).json()).toEqual({ interviews: null });
    current.session = signedIn();
    interviewsOpenWithin.mockResolvedValue(false);
    expect(await (await GET(get())).json()).toEqual({ interviews: null });
    expect(interviewsOpenWithin).toHaveBeenCalledWith('octocat');
    expect(loadInterviewsForCourses).not.toHaveBeenCalled();
  });

  it("answers the list's part for a person it is open to, each course of the section read by its slug", async () => {
    current.session = signedIn();
    const response = await GET(get());
    expect(await response.json()).toEqual({ interviews: coursesInterviews });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(loadLearnCourse.mock.calls.map(([slug]) => slug)).toEqual(['interview-skills', 'interviewing-at-northwind']);
  });

  it('leaves out a course that cannot be read, and is null when nothing is left or the read fails', async () => {
    current.session = signedIn();
    loadLearnCourse.mockImplementation(async (slug: string) => {
      if (slug === 'interview-skills') throw new Error('down');
      return whole(northwindCourseCard);
    });
    const { interviews } = await (await GET(get())).json();
    expect(interviews.section.map(({ course }: { course: { slug: string } }) => course.slug)).toEqual([
      'interviewing-at-northwind',
    ]);
    loadInterviewsForCourses.mockResolvedValue({ top: [], companies: [], section: [] });
    expect(await (await GET(get())).json()).toEqual({ interviews: null });
    loadInterviewsForCourses.mockRejectedValue(new Error('down'));
    expect(await (await GET(get())).json()).toEqual({ interviews: null });
  });
});
