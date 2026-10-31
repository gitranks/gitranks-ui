import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/runs',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/app/contribute/runs/actions', () => ({ readRunsPage: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadContributeActivity: vi.fn() }));
vi.mock('@/lib/contribute/runs.data', () => ({ loadRuns: vi.fn() }));

const { RunsScreen } = await import('./runs-view');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { activityOf, WORKING } = await import('@/lib/contribute/__fixtures__/agent-runs');
const { pageOf } = await import('@/lib/contribute/__fixtures__/runs');
const { runsQueryOf } = await import('@/lib/contribute/runs');

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

describe('Agent runs', () => {
  it('shows the totals, the no-go split and the runs by day, with the day’s sums over the whole day', () => {
    const html = render();
    const page = text(html);
    expect(page).toContain('Agent runs');
    expect(page).toMatch(/Runs 26 6 didn't start/);
    expect(page).toMatch(/Spent \$2\.35 \$0\.12 a started run/);
    expect(page).toMatch(/Pull requests 5 1 merged · 1 closed · 3 open/);
    expect(page).toMatch(/Merge rate 50% of 2 decided/);
    expect(page).toMatch(/No-go rate 65% 13 of 20 started · \$1\.26/);
    expect(page).toMatch(/Needs design 6 .*Can't reproduce 4 .*Already fixed 2 .*Handled by a bot 1/);
    expect(page).toContain('Today · Sat, Oct 31 · 25 runs · $2.28 · 4 PRs');
    expect(page).toContain('Yesterday · Fri, Oct 30 · 1 run · $0.07 · 1 PR');
    expect(page).toContain('Showing 6 of 26 runs');
    expect(html).toContain('Load more');
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
    expect(html).toContain('href="/contribute/attempts/6ae66d0292fedc1b8de48d65"');
  });

  it('folds back-to-back runs that never started on one issue into one quiet line', () => {
    const page = text(render());
    expect(page).toContain('recharts/recharts#8040 ×2');
    expect(page).toContain('Another PR already references it, at each retry');
    expect(page).toContain('Issue #8040');
  });

  it('keeps the filters in the links: the chips, and a category on the bar that a second click clears', () => {
    const html = render({ query: runsQueryOf({ reason: 'needs_design', repo: 'can1357/oh-my-pi' }) });
    expect(html).toContain('href="/contribute/runs?outcome=no_go&amp;repo=can1357%2Foh-my-pi"');
    expect(html).toContain('href="/contribute/runs?repo=can1357%2Foh-my-pi"');
    // The category picked is current, and its link drops it.
    expect(html).toMatch(
      /aria-current="true"[^>]*href="\/contribute\/runs\?repo=can1357%2Foh-my-pi"|href="\/contribute\/runs\?repo=can1357%2Foh-my-pi"[^>]*aria-current="true"/,
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
