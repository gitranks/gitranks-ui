import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/attempts/A_1',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/app/learn/actions', () => ({}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadPrNotes: vi.fn(async () => undefined),
  loadRepliesWaiting: vi.fn(async () => undefined),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnOpen: vi.fn(async () => true),
  loadLearnSetup: vi.fn(async () => false),
  loadAttemptLesson: vi.fn(async () => null),
}));

const { FirstSessionView } = await import('@/app/contribute/components/review-view');
const { LearnAttemptView } = await import('./components/learn-attempt');
const contributeData = await import('@/lib/contribute/contribute.data');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');

const params = Promise.resolve({ id: 'A_1' });

describe('the redirects between a contribution and a lesson', () => {
  it("keeps the grant's resume when a Learn attempt's Contribute address sends it to its lesson", async () => {
    vi.mocked(contributeData.loadContribute).mockResolvedValue(views.active);
    vi.mocked(contributeData.loadAttempt).mockResolvedValue(detail({ attemptId: 'A_1', mode: 'LEARN' }));
    await expect(
      FirstSessionView({ params, searchParams: Promise.resolve({ resume: 'n0nce', session: 'x' }) }),
    ).rejects.toThrow('NEXT_REDIRECT /learn/attempts/A_1?resume=n0nce');
    await expect(FirstSessionView({ params, searchParams: Promise.resolve({}) })).rejects.toThrow(
      /^NEXT_REDIRECT \/learn\/attempts\/A_1$/,
    );
  });

  it("keeps the query when a Fix attempt's Learn address sends it to its contribution", async () => {
    vi.mocked(contributeData.loadContribute).mockResolvedValue(views.active);
    vi.mocked(contributeData.loadAttempt).mockResolvedValue(detail({ attemptId: 'A_1', mode: 'FIX' }));
    await expect(LearnAttemptView({ params, searchParams: Promise.resolve({ resume: 'n0nce' }) })).rejects.toThrow(
      'NEXT_REDIRECT /contribute/attempts/A_1?resume=n0nce',
    );
  });
});
