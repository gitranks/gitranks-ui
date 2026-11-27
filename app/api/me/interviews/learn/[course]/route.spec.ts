import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { current, interviewsOpenWithin, loadInterviewsForCourse } = vi.hoisted(() => ({
  current: { session: null as Session | null },
  interviewsOpenWithin: vi.fn(),
  loadInterviewsForCourse: vi.fn(),
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
vi.mock('@/lib/interviews/learn.data', () => ({ loadInterviewsForCourse }));

type Route = (req: NextRequest, ctx: { params: Promise<{ course: string }> }) => Promise<Response>;
const { GET } = (await import('./route')) as unknown as { GET: Route };
const { forAlgorithmsCourse } = await import('@/lib/interviews/__fixtures__/learn-course');

const get = (course = 'algorithms') =>
  GET(new NextRequest(`https://gitranks.com/api/me/interviews/learn/${course}`), {
    params: Promise.resolve({ course }),
  });
const signedIn = (extra: object = {}) =>
  ({ user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', ...extra }) as unknown as Session;

beforeEach(() => {
  current.session = null;
  interviewsOpenWithin.mockReset().mockResolvedValue(true);
  loadInterviewsForCourse.mockReset().mockResolvedValue(forAlgorithmsCourse);
});

describe('/api/me/interviews/learn/[course]', () => {
  it('is null signed out, without asking the API, and never kept', async () => {
    const response = await get();
    expect(await response.json()).toEqual({ course: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(interviewsOpenWithin).not.toHaveBeenCalled();
    expect(loadInterviewsForCourse).not.toHaveBeenCalled();
  });

  it('is null for a session that needs a new sign-in, and for a person Interviews is not open to', async () => {
    current.session = signedIn({ error: 'RefreshTokenError' });
    expect(await (await get()).json()).toEqual({ course: null });
    current.session = signedIn();
    interviewsOpenWithin.mockResolvedValue(false);
    expect(await (await get()).json()).toEqual({ course: null });
    expect(interviewsOpenWithin).toHaveBeenCalledWith('octocat');
    expect(loadInterviewsForCourse).not.toHaveBeenCalled();
  });

  it('is null for a slug that is not one, without asking', async () => {
    current.session = signedIn();
    expect(await (await get('Not a slug')).json()).toEqual({ course: null });
    expect(interviewsOpenWithin).not.toHaveBeenCalled();
    expect(loadInterviewsForCourse).not.toHaveBeenCalled();
  });

  it("answers the course's part for a person it is open to, never kept", async () => {
    current.session = signedIn();
    const response = await get();
    expect(await response.json()).toEqual({ course: forAlgorithmsCourse });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(loadInterviewsForCourse).toHaveBeenCalledWith('algorithms');
  });

  it('is null when the read fails', async () => {
    current.session = signedIn();
    loadInterviewsForCourse.mockRejectedValue(new Error('down'));
    expect(await (await get()).json()).toEqual({ course: null });
  });
});
