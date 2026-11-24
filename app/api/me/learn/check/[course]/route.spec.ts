import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCheckSide, loadLearnMainLanguage, current } = vi.hoisted(() => ({
  loadLearnCheckSide: vi.fn(),
  loadLearnMainLanguage: vi.fn(async () => null as string | null),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }, ctx: unknown) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, ctx: unknown) => {
    req.auth = current.session;
    return handler(req, ctx);
  },
}));
vi.mock('@/lib/learn/check.data', () => ({ loadLearnCheckSide }));
vi.mock('@/lib/learn/setup.data', () => ({ loadLearnMainLanguage }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, ctx: { params: Promise<{ course: string }> }) => Promise<Response>;
};
const { checkEnded, checkRunOf } = await import('@/lib/learn/__fixtures__/check');

const get = (course = 'algorithms') =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/check/${course}`), { params: Promise.resolve({ course }) });
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};

describe("the person's check route", () => {
  beforeEach(() => {
    loadLearnCheckSide.mockReset();
    loadLearnMainLanguage.mockReset();
    loadLearnMainLanguage.mockResolvedValue(null);
    current.session = null;
  });

  it('answers nothing signed out or with a session that needs a new sign-in, without asking, never kept', async () => {
    for (const session of [() => {}, () => signIn('RefreshTokenError')]) {
      current.session = null;
      session();
      const res = await get();
      expect(await res.json()).toEqual({ check: null, missing: false, mainLanguage: null });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadLearnCheckSide).not.toHaveBeenCalled();
    expect(loadLearnMainLanguage).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's run with their main language, never kept", async () => {
    signIn();
    const side = { check: checkRunOf(3), missing: false };
    loadLearnCheckSide.mockResolvedValue(side);
    loadLearnMainLanguage.mockResolvedValue('javascript');
    const res = await get();
    expect(await res.json()).toEqual({ ...side, mainLanguage: 'javascript' });
    expect(loadLearnMainLanguage).toHaveBeenCalledWith('octocat');
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnCheckSide).toHaveBeenCalledWith('octocat', 'algorithms');
  });

  it('says a course has no check', async () => {
    signIn();
    loadLearnCheckSide.mockResolvedValue({ check: null, missing: true });
    expect(await (await get('nope')).json()).toEqual({ check: null, missing: true, mainLanguage: null });
    expect(loadLearnMainLanguage).not.toHaveBeenCalled();
  });

  it('reads the main language for a run still going only: never for an ended run or none', async () => {
    signIn();
    loadLearnMainLanguage.mockResolvedValue('javascript');
    const ended = { check: checkEnded(), missing: false };
    loadLearnCheckSide.mockResolvedValue(ended);
    expect(await (await get()).json()).toEqual({ ...ended, mainLanguage: null });
    loadLearnCheckSide.mockResolvedValue({ check: null, missing: false });
    expect(await (await get()).json()).toEqual({ check: null, missing: false, mainLanguage: null });
    expect(loadLearnMainLanguage).not.toHaveBeenCalled();
  });
});
