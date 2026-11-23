import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnReviewSide, current } = vi.hoisted(() => ({
  loadLearnReviewSide: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/learn/review.data', () => ({ loadLearnReviewSide }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { reviewSide } = await import('@/lib/learn/__fixtures__/review');

const get = (query = '') => GET(new NextRequest(`https://gitranks.com/api/me/learn/review${query}`));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};

describe("the person's review route", () => {
  beforeEach(() => {
    loadLearnReviewSide.mockReset();
    current.session = null;
  });

  it('answers nothing signed out or with a session that needs a new sign-in, without asking, never kept', async () => {
    for (const session of [() => {}, () => signIn('RefreshTokenError')]) {
      current.session = null;
      session();
      const res = await get('?course=algorithms');
      expect(await res.json()).toEqual({ review: null, signedOut: true });
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(loadLearnReviewSide).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's set, of every course or of one, never kept", async () => {
    signIn();
    loadLearnReviewSide.mockResolvedValue(reviewSide);
    const res = await get();
    expect(await res.json()).toEqual({ review: reviewSide, signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(loadLearnReviewSide).toHaveBeenLastCalledWith('octocat', null);
    await get('?course=algorithms');
    expect(loadLearnReviewSide).toHaveBeenLastCalledWith('octocat', 'algorithms');
  });

  it('answers none when Learn is not open to the person, or the read failed', async () => {
    signIn();
    loadLearnReviewSide.mockResolvedValue(null);
    expect(await (await get()).json()).toEqual({ review: null, signedOut: false });
  });
});
