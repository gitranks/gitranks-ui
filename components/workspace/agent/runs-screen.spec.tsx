import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/agent/runs',
  useSearchParams: () => new URLSearchParams(),
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
const reads = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(async () => false),
  loadContribute: vi.fn(),
  loadContributeActivity: vi.fn(async () => null),
  loadRuns: vi.fn(),
}));
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: reads.loadLearnOpen }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: reads.loadContribute,
  loadContributeActivity: reads.loadContributeActivity,
}));
vi.mock('@/lib/workspace/runs.data', () => ({ loadRuns: reads.loadRuns }));

const { RunsScreen, RunsView } = await import('./runs-view');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { activityOf, WORKING } = await import('@/lib/contribute/__fixtures__/agent-runs');
const { learnerPageOf, pageOf } = await import('@/lib/contribute/__fixtures__/runs');
const { RUNS_PAGE_MAX, runsHref, runsPageOf, runsQueryOf } = await import('@/lib/workspace/runs');

const NOW = new Date('2026-10-31T23:20:00.000Z');
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');
const render = (props: Partial<Parameters<typeof RunsScreen>[0]> = {}) =>
  renderToStaticMarkup(<RunsScreen view={views.active} page={pageOf()} query={runsQueryOf({})} now={NOW} {...props} />);

describe('Runs', () => {
  it('shows the totals, the no-go split and the runs by day, with the day’s sums over the whole day', () => {
    const html = render();
    const page = text(html);
    expect(page).toContain('Agent Runs Every run an agent made for you');
    expect(html).toMatch(/href="\/my\/agent"[^>]*>.*Agent<\/a>/);
    expect(page).toMatch(/Runs 26 6 didn't start/);
    expect(page).toMatch(/Spent \$2\.35 \$0\.12 a started run/);
    expect(page).toMatch(/Pull requests 5 1 merged · 1 closed · 3 open/);
    expect(page).toMatch(/Merge rate 50% of 2 decided/);
    expect(page).toMatch(/No-go rate 65% 13 of 20 started · \$1\.26/);
    expect(page).toMatch(/Needs design 6 .*Can't reproduce 4 .*Already fixed 2 .*Handled by a bot 1/);
    expect(page).toContain('Today · Sat, Oct 31 · 25 runs · $2.28 · 4 PRs');
    expect(page).toContain('Yesterday · Fri, Oct 30 · 1 run · $0.07 · 1 PR');
    expect(page).toContain('1–20 of 26 runs');
    expect(html).not.toContain('Load more');
  });

  it('pages the history by 20, the page in the address with the filters kept', () => {
    const query = runsQueryOf({ outcome: 'no_go', repo: 'can1357/oh-my-pi', page: '2' });
    const html = render({ query, number: 2, page: pageOf({ totals: { ...pageOf().totals, runs: 46 } }) });
    expect(text(html)).toContain('21–40 of 46 runs');
    expect(html).toMatch(/rel="prev"[^>]*href="\/my\/agent\/runs\?outcome=no_go&amp;repo=can1357%2Foh-my-pi"/);
    expect(html).toMatch(
      /rel="next"[^>]*href="\/my\/agent\/runs\?outcome=no_go&amp;repo=can1357%2Foh-my-pi&amp;page=3"/,
    );
    // A filter's link starts on its first page.
    expect(html).toContain('href="/my/agent/runs?outcome=pr&amp;repo=can1357%2Foh-my-pi"');
    expect(html).not.toMatch(/href="[^"]*outcome=pr[^"]*page=/);
    expect(runsPageOf({ page: '3' })).toBe(3);
    expect(runsPageOf({ page: '0' })).toBe(1);
    expect(runsPageOf({ page: 'x' })).toBe(1);
    // Past the most runs the API skips, the last page it can read.
    expect(RUNS_PAGE_MAX).toBe(501);
    expect(runsPageOf({ page: '9999' })).toBe(501);
    expect(runsHref(query, 1)).toBe('/my/agent/runs?outcome=no_go&repo=can1357%2Foh-my-pi');
    // Everything on one page: no pages.
    expect(render({ page: pageOf({ totals: { ...pageOf().totals, runs: 20 } }) })).not.toContain('data-pagination');
  });

  it('opens each row with its reference line: the repo, the issue and the pull request on GitHub', () => {
    const html = render();
    expect(html).toContain('href="https://github.com/renovatebot/renovate/issues/36837"');
    expect(html).toContain('href="https://github.com/renovatebot/renovate/pull/47605"');
    // A follow-up's pull request is its first attempt's.
    expect(html).toContain('href="https://github.com/recharts/recharts/pull/8136"');
  });

  it("shows a learner's runs without spend: their lessons in place of Spent and the no-go rate, no cost column", () => {
    const html = render({ view: views.agentOnboarded, page: learnerPageOf(), learner: true });
    const page = text(html);
    expect(page).toContain('Every run your agent made for you');
    expect(page).toContain('Lessons written 7 5 passed by you');
    expect(page).not.toContain('Spent');
    expect(page).not.toContain('No-go rate');
    expect(page).not.toMatch(/\$\d/);
    expect(page).not.toContain('of started runs');
    expect(html).not.toMatch(/>Cost<\/th>/);
    expect(page).toContain('Your own agent · Claude Code');
    expect(page).toMatch(/tidewave\/tide Issue #958 .* Learn /);
  });

  it('says each run’s outcome and why, its runner, time and cost, and links the whole row to the run', () => {
    const html = render();
    const page = text(html);
    expect(page).toContain('No-go · Needs design');
    expect(page).toContain('Needs a design decision.');
    expect(page).toContain('Hosted · Opus 5.5');
    expect(page).toContain('32s');
    expect(page).toContain('PR #47605 · waiting on maintainers');
    expect(page).toContain('↳ Follow-up on PR #8136');
    expect(page).toContain('The tests did not pass');
    expect(html).toContain('title="Go/no-go $0.08 · work $0.07"');
    expect(html).toContain('href="/my/pull-requests/by-attempt/6ae66d0292fedc1b8de48d65"');
  });

  it('folds back-to-back runs that never started on one issue into one quiet line', () => {
    const page = text(render());
    expect(page).toContain('recharts/recharts Issue #8040 ↗ (opens GitHub) ×2');
    expect(page).toContain('Another PR already references it, at each retry');
    expect(page).toContain('Issue #8040');
  });

  it('keeps the filters in the links: the chips, and a category on the bar that a second click takes back to every no-go', () => {
    const html = render({ query: runsQueryOf({ reason: 'needs_design', repo: 'can1357/oh-my-pi' }) });
    expect(html).toContain('href="/my/agent/runs?outcome=no_go&amp;repo=can1357%2Foh-my-pi"');
    expect(html).toContain('href="/my/agent/runs?repo=can1357%2Foh-my-pi"');
    // The category picked is current, and its link drops it back to every no-go; the others switch to theirs.
    expect(html).toMatch(/aria-current="true"[^>]*href="\/my\/agent\/runs\?outcome=no_go&amp;repo=can1357%2Foh-my-pi"/);
    expect(html).toContain(
      'href="/my/agent/runs?outcome=no_go&amp;reason=cannot_reproduce&amp;repo=can1357%2Foh-my-pi"',
    );
  });

  it('shows the runs at work now above the history', () => {
    const page = text(render({ activity: activityOf(WORKING) }));
    expect(page.indexOf('Working now')).toBeGreaterThan(-1);
    expect(page.indexOf('Working now')).toBeLessThan(page.indexOf('History'));
  });

  it('has an empty state for no runs, for filters that match none, for a quiet month and for an API that does not answer', () => {
    const none = pageOf({ items: [], repos: [], days: [], nextCursor: null });
    expect(text(render({ page: none }))).toContain('No runs yet');
    expect(
      text(render({ page: pageOf({ items: [], days: [], nextCursor: null }), query: runsQueryOf({ runner: 'own' }) })),
    ).toContain('No runs match these filters');
    expect(text(render({ page: pageOf({ items: [], days: [], nextCursor: null }) }))).toContain(
      'No runs in the last 30 days',
    );
    expect(text(render({ page: undefined }))).toContain('Your runs are not available right now');
  });
});

describe('RunsView', () => {
  it('reads the page the address asks for, and sends a page past the end to the last, the filters kept', async () => {
    reads.loadContribute.mockResolvedValue(views.active);
    reads.loadRuns.mockResolvedValue(pageOf({ items: [], days: [], totals: { ...pageOf().totals, runs: 46 } }));
    const searchParams = Promise.resolve({ outcome: 'no_go', page: '9' });
    await expect(RunsView({ searchParams })).rejects.toThrow('NEXT_REDIRECT /my/agent/runs?outcome=no_go&page=3');
    expect(reads.loadRuns).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'NO_GO' }), { page: 9 });
  });

  it('draws the page it asked for when it has runs', async () => {
    reads.loadContribute.mockResolvedValue(views.active);
    reads.loadRuns.mockResolvedValue(pageOf({ totals: { ...pageOf().totals, runs: 46 } }));
    const html = renderToStaticMarkup(await RunsView({ searchParams: Promise.resolve({ page: '2' }) }));
    expect(text(html)).toContain('21–40 of 46 runs');
  });
});
