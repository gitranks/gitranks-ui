import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { load, current } = vi.hoisted(() => ({
  load: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/real-issues.data', () => ({ loadHomeIssuesEmail: load }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/home/issues-email'));

describe("Learn home's list email for the person", () => {
  beforeEach(() => {
    load.mockReset();
    current.session = null;
  });

  it('answers none signed out, without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ email: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(load).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's email, and none on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    load.mockResolvedValueOnce({ emailOn: true, emailTo: 'a@b.c' });
    expect(await (await get()).json()).toEqual({ email: { emailOn: true, emailTo: 'a@b.c' } });
    expect(load).toHaveBeenCalledWith('octocat');
    load.mockRejectedValueOnce(new Error('down'));
    expect(await (await get()).json()).toEqual({ email: null });
  });
});
