import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadFixMarks, current } = vi.hoisted(() => ({
  loadFixMarks: vi.fn(),
  current: { session: null as Session | null },
}));

type Params = { owner: string; repo: string; number: string };
type Context = { params: Promise<Params> };
type Handler = (req: NextRequest & { auth: Session | null }, context: Context) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, context: Context) => {
    req.auth = current.session;
    return handler(req, context);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadFixMarks, NO_FIX_MARKS: { marks: null, reads: null } }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};

const get = (number = '57') =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/fixes/acme/widgets/${number}/marks`), {
    params: Promise.resolve({ owner: 'acme', repo: 'widgets', number }),
  });

describe("the person's marks on a fix's page", () => {
  beforeEach(() => {
    loadFixMarks.mockReset();
    current.session = null;
  });

  it('answers none signed out, asking nothing, never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ marks: null, reads: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadFixMarks).not.toHaveBeenCalled();
  });

  it("reads the signed-in person's marks for the pull request the address names", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    loadFixMarks.mockResolvedValue({ marks: { fixer: false }, reads: null });
    const res = await get();
    expect(await res.json()).toEqual({ marks: { fixer: false }, reads: null });
    expect(loadFixMarks).toHaveBeenCalledWith({ nameWithOwner: 'acme/widgets', number: 57 }, 'octocat');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('answers none for an address that names no pull request, and on a failure', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    expect(await (await get('057')).json()).toEqual({ marks: null, reads: null });
    loadFixMarks.mockRejectedValue(new Error('down'));
    expect(await (await get()).json()).toEqual({ marks: null, reads: null });
  });
});
