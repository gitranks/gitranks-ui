import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
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
vi.mock('@/lib/learn/actions', () => ({}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin: vi.fn(async () => 'octocat'),
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadPrNotes: vi.fn(async () => undefined),
  loadRepliesWaiting: vi.fn(async () => undefined),
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadIssueAttempt: vi.fn(async () => ({
    attemptId: 'A_1',
    mode: 'LEARN',
    repo: 'driftwood-js/driftwood',
    number: 871,
    earlier: null,
  })),
}));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnOpen: vi.fn(async () => true),
  loadLearnSetup: vi.fn(async () => false),
  loadAttemptLesson: vi.fn(async () => null),
}));

const { FirstSessionView } = await import('@/components/workspace/pull-request/review-view');
const { LearnAttemptView } = await import('./components/learn-attempt');
const contributeData = await import('@/lib/workspace/contribute.data');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');

const params = Promise.resolve({ id: 'A_1' });
const page = Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', issue: '871' });

describe('the redirects between a contribution and a lesson', () => {
  it("keeps the grant's resume when a Learn attempt's pull request page sends it to its lesson", async () => {
    vi.mocked(contributeData.loadContribute).mockResolvedValue(views.active);
    vi.mocked(contributeData.loadAttempt).mockResolvedValue(detail({ attemptId: 'A_1', mode: 'LEARN' }));
    await expect(
      FirstSessionView({ params: page, searchParams: Promise.resolve({ resume: 'n0nce', session: 'x' }) }),
    ).rejects.toThrow('NEXT_REDIRECT /learn/attempts/A_1?resume=n0nce');
    await expect(FirstSessionView({ params: page, searchParams: Promise.resolve({}) })).rejects.toThrow(
      /^NEXT_REDIRECT \/learn\/attempts\/A_1$/,
    );
  });

  it("keeps the query when a Fix attempt's Learn address sends it to its pull request, by its id", async () => {
    vi.mocked(contributeData.loadContribute).mockResolvedValue(views.active);
    vi.mocked(contributeData.loadAttempt).mockResolvedValue(detail({ attemptId: 'A_1', mode: 'FIX' }));
    await expect(LearnAttemptView({ params, searchParams: Promise.resolve({ resume: 'n0nce' }) })).rejects.toThrow(
      'NEXT_REDIRECT /my/pull-requests/by-attempt/A_1?resume=n0nce',
    );
  });
});
