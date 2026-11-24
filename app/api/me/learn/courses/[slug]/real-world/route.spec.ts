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
vi.mock('@/lib/learn/real-issues.data', () => ({ loadCourseOpenIssues: load }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};

const get = (slug: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/courses/${slug}/real-world`), {
    params: Promise.resolve({ slug }),
  });

describe("a course's open issues for the person", () => {
  beforeEach(() => {
    load.mockReset();
    current.session = null;
  });

  it('answers none signed out, without asking the API, and is never kept', async () => {
    const res = await get('algorithms');
    expect(await res.json()).toEqual({ openIssues: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(load).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's count, and none on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    load.mockResolvedValueOnce(3);
    expect(await (await get('algorithms')).json()).toEqual({ openIssues: 3 });
    expect(load).toHaveBeenCalledWith('algorithms', 'octocat');
    load.mockResolvedValueOnce(null);
    expect(await (await get('algorithms')).json()).toEqual({ openIssues: null });
    load.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('algorithms')).json()).toEqual({ openIssues: null });
  });
});
