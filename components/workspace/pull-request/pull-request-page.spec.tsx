import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests/driftwood-js/driftwood/871',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin: vi.fn(),
  loadContribute: vi.fn(),
  loadContributeSetup: vi.fn(async () => null),
  loadAttempt: vi.fn(),
  loadIssueAttempt: vi.fn(),
  loadPrNotes: vi.fn(async () => undefined),
  loadRepliesWaiting: vi.fn(async () => []),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));

const { ContributionLayout, FirstSessionView, RunSessionView } = await import('./review-view');
const data = await import('@/lib/workspace/contribute.data');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { attempts, detail, followUp, followUpAttempts } = await import(
  '@/lib/contribute/__fixtures__/contribute-attempts'
);

const PAGE = '/my/pull-requests/driftwood-js/driftwood/871';
const params = (over: Partial<{ owner: string; repo: string; issue: string; attemptId: string }> = {}) =>
  Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', issue: '871', ...over });
const query = (q: Record<string, string> = {}) => Promise.resolve(q);
const ref = (over: Record<string, unknown> = {}) => ({
  attemptId: 'A_1',
  mode: 'FIX' as const,
  repo: 'driftwood-js/driftwood',
  number: 871,
  earlier: null as string[] | null,
  ...over,
});

/** The viewer's attempts by id. */
const has = (...read: ReturnType<typeof detail>[]) =>
  vi.mocked(data.loadAttempt).mockImplementation(async (id: string) => read.find((a) => a.attemptId === id) ?? null);

beforeEach(() => {
  vi.mocked(data.viewerLogin).mockResolvedValue('octocat');
  vi.mocked(data.loadContribute).mockResolvedValue(views.active);
  vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref());
  has(attempts.prOpen);
});

describe("the pull request's page, by repo and issue", () => {
  it("shows the viewer's newest attempt on the issue, its header and sessions under the issue's address", async () => {
    const html = renderToStaticMarkup(await ContributionLayout({ params: params(), children: <span data-session /> }));
    expect(html).toContain('data-contribution="A_1"');
    expect(html).toContain('data-pr-header=""');
    expect(html).toContain('data-session="true"');
    expect(html).toContain(`href="${PAGE}"`);
    expect(html).not.toContain('data-earlier-attempt');
    expect(await FirstSessionView({ params: params(), searchParams: query() })).toBeTruthy();
    expect(data.loadIssueAttempt).toHaveBeenCalledWith('driftwood-js', 'driftwood', 871);
  });

  it('shows an earlier attempt on the issue under its own address, with the way to the latest', async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref({ attemptId: 'A_2', earlier: ['A_1'] }));
    has(followUpAttempts.quiet);
    const html = renderToStaticMarkup(
      await ContributionLayout({ params: params({ attemptId: 'A_1' }), children: <span data-session /> }),
    );
    expect(html).toContain('data-earlier-attempt=""');
    expect(html).toContain(`href="${PAGE}"`);
    expect(html).toContain(`href="${PAGE}/earlier/A_1"`);
    expect(html).toContain(`href="${PAGE}/earlier/A_1/runs/A_F1"`);
    expect(html).not.toContain(`href="${PAGE}/runs/`);
    expect(await FirstSessionView({ params: params({ attemptId: 'A_1' }), searchParams: query() })).toBeTruthy();
  });

  it('sends an earlier address that names the latest attempt to the latest, the query kept', async () => {
    await expect(
      FirstSessionView({ params: params({ attemptId: 'A_1' }), searchParams: query({ session: 'next' }) }),
    ).rejects.toThrow(`NEXT_REDIRECT ${PAGE}?session=next`);
  });

  it('answers the 404 for an earlier id that is not a first attempt on this issue', async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref({ attemptId: 'A_2' }));
    has(detail({ attemptId: 'A_9', number: 12, nameWithOwner: 'other/repo' }), followUp({ attemptId: 'A_F1' }));
    await expect(ContributionLayout({ params: params({ attemptId: 'A_9' }), children: null })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
    await expect(ContributionLayout({ params: params({ attemptId: 'A_F1' }), children: null })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it("sends an address in another spelling to the repo's current name, every session and the query kept", async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref({ repo: 'driftwood-js/driftwood-next' }));
    await expect(
      FirstSessionView({ params: params(), searchParams: query({ resume: 'n0nce', session: 'next' }) }),
    ).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/driftwood-js/driftwood-next/871?resume=n0nce&session=next');
    await expect(
      RunSessionView({ params: params().then((p) => ({ ...p, runId: 'A_F1' })), searchParams: query({ move: 'x' }) }),
    ).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/driftwood-js/driftwood-next/871/runs/A_F1?move=x');
    // The layout leaves the page to move on.
    const html = renderToStaticMarkup(await ContributionLayout({ params: params(), children: <span data-session /> }));
    expect(html).toBe('<span data-session="true"></span>');
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref());
    await expect(FirstSessionView({ params: params({ issue: '0871' }), searchParams: query() })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it('answers the 404 for an issue the viewer never attempted, or an issue that is no number', async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(null);
    await expect(ContributionLayout({ params: params(), children: null })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(FirstSessionView({ params: params(), searchParams: query() })).rejects.toThrow('NEXT_NOT_FOUND');
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref());
    await expect(FirstSessionView({ params: params({ issue: 'abc' }), searchParams: query() })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it("says the page didn't load while the API does not answer", async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(undefined);
    const html = renderToStaticMarkup(await FirstSessionView({ params: params(), searchParams: query() }));
    expect(html).toContain('data-review="unavailable"');
    expect(html).toContain('This page didn&#x27;t load');
  });

  it('asks a visitor to sign in, and reads nothing for them', async () => {
    vi.mocked(data.viewerLogin).mockResolvedValue(null);
    vi.mocked(data.loadIssueAttempt).mockClear();
    const html = renderToStaticMarkup(await ContributionLayout({ params: params(), children: <span data-session /> }));
    expect(html).toContain('data-attempt-sign-in="contribution"');
    expect(html).not.toContain('data-session');
    await expect(FirstSessionView({ params: params(), searchParams: query() })).resolves.toBeNull();
    expect(data.loadIssueAttempt).not.toHaveBeenCalled();
  });

  it("shows a run under its first attempt's page, and sends any other id on to its own page by id", async () => {
    const run = followUp({ attemptId: 'A_F1' });
    has(attempts.prOpen, run, detail({ attemptId: 'A_5' }));
    const runParams = (runId: string) => params().then((p) => ({ ...p, runId }));
    expect(await RunSessionView({ params: runParams('A_F1'), searchParams: query() })).toBeTruthy();
    await expect(RunSessionView({ params: runParams('A_5'), searchParams: query({ move: 'x' }) })).rejects.toThrow(
      'NEXT_REDIRECT /my/pull-requests/by-attempt/A_5?move=x',
    );
    await expect(RunSessionView({ params: runParams('A_404'), searchParams: query() })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });

  it("keeps a Learn attempt's page on its lesson for now, but its next step here", async () => {
    vi.mocked(data.loadIssueAttempt).mockResolvedValue(ref({ mode: 'LEARN' }));
    has({ ...attempts.prOpen, mode: 'LEARN' });
    await expect(FirstSessionView({ params: params(), searchParams: query({ resume: 'n0nce' }) })).rejects.toThrow(
      'NEXT_REDIRECT /learn/attempts/A_1?resume=n0nce',
    );
  });
});
