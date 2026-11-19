import type { Route } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { WorkingNowSection } from './agent-runs';
import { RunsFilters } from './runs-filters';
import { RunsList } from './runs-list';
import { RunsTiles } from './runs-tiles';
import { ContributeNotices } from '@/components/workspace/contribute-notices';
import { Pagination } from '@/components/workspace/pagination';
import { HEADING } from '@/components/workspace/primitives';
import { SettingsPageHead } from '@/components/workspace/settings-rows';
import { cn } from '@/lib/utils';
import { audienceOf } from '@/lib/workspace/audience';
import { loadContribute, loadContributeActivity, loadContributeSetup } from '@/lib/workspace/contribute.data';
import type { ContributeActivity, ContributeView } from '@/lib/workspace/contribute.types';
import { contributeNoticesOf, isContributePageOpen } from '@/lib/workspace/contribute-state';
import { loadLearnOpen } from '@/lib/workspace/gate.data';
import { RUNS_PATH } from '@/lib/workspace/paths';
import {
  type ContributeRunsPage,
  type ContributeRunsTotals,
  isFiltered,
  NO_GO_CATEGORIES,
  OUTCOME_FILTERS,
  percentLabel,
  RUNS_PAGE_SIZE,
  type RunsQuery,
  runsFilterOf,
  runsHref,
  runsPageOf,
  runsQueryOf,
} from '@/lib/workspace/runs';
import { loadRuns } from '@/lib/workspace/runs.data';
import { contributeHidden } from '@/lib/workspace/setting-up';

export async function RunsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = runsQueryOf(params);
  const number = runsPageOf(params);
  const now = new Date();
  const [view, page, activity, learnOpen] = await Promise.all([
    loadContribute(),
    loadRuns(runsFilterOf(query, now), { page: number }),
    loadContributeActivity().catch(() => null),
    loadLearnOpen(),
  ]);
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'runs')) redirect('/contribute');
  // A page past the end: the last page.
  if (page && !page.items.length && number > 1) {
    const last = Math.max(1, Math.ceil(page.totals.runs / RUNS_PAGE_SIZE));
    if (last < number) redirect(runsHref(query, last) as Route);
  }
  return (
    <RunsScreen
      view={view}
      page={page}
      query={query}
      number={number}
      learner={audienceOf(view.sides, learnOpen) === 'learner'}
      activity={activity}
      now={now}
    />
  );
}

/**
 * Why the agents said no-go: every no-go under the repo, runner and dates by category, whatever is picked; each part a
 * link that filters the list to it, and picked, back to every no-go.
 */
function NoGoBreakdown({
  totals,
  query,
  learner,
}: {
  totals: ContributeRunsTotals;
  query: RunsQuery;
  /** No no-go rate for a learner. */
  learner: boolean;
}) {
  const parts = totals.noGoByCategory;
  if (!parts.length && !totals.noGo) return null;
  const sum = parts.reduce((all, { count }) => all + count, 0);
  const hrefOf = (category: (typeof parts)[number]['category']) =>
    runsHref({ ...query, outcome: 'NO_GO', reason: query.reason === category ? undefined : category }) as Route;
  return (
    <section
      aria-labelledby="runs-no-go"
      className="flex flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5"
      data-section="no-go"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="runs-no-go" className={HEADING.block}>
          Why agents said no-go, or ran out
        </h2>
        <span className="text-xs text-muted-foreground">
          {!learner && !query.outcome && !query.reason ? (
            <span className="lg:hidden">{percentLabel(totals.noGo, totals.started)} of started runs · </span>
          ) : null}
          {sum ? `${sum} no-go${sum === 1 ? '' : 's'} · pick one to filter` : `${totals.noGo} no-gos`}
        </span>
      </div>
      {parts.length ? (
        <>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {parts.map(({ category, count }) => (
              <span
                key={category}
                className={cn('h-full', query.reason && query.reason !== category && 'opacity-35')}
                style={{ flexGrow: count, background: NO_GO_CATEGORIES[category]?.color }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {parts.map(({ category, count }) => (
              <li key={category}>
                <Link
                  href={hrefOf(category)}
                  prefetch={false}
                  scroll={false}
                  aria-current={query.reason === category ? 'true' : undefined}
                  className="inline-flex min-h-7 items-center gap-1.5 rounded-sm hover:underline aria-[current]:font-semibold aria-[current]:underline"
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-xs"
                    style={{ background: NO_GO_CATEGORIES[category]?.color }}
                  />
                  {NO_GO_CATEGORIES[category]?.label ?? category}
                  <span className="font-mono text-muted-foreground">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Their reasons are not sorted into categories yet.</p>
      )}
    </section>
  );
}

/** All, then each outcome group, with its count under the other filters; a picked category counts as No-go. */
function OutcomeChips({ page, query }: { page: ContributeRunsPage; query: RunsQuery }) {
  const countOf = (outcome: string) => page.outcomeCounts.find((each) => each.outcome === outcome)?.count ?? 0;
  const current = query.reason ? 'NO_GO' : (query.outcome ?? 'ALL');
  const chips = [{ value: 'ALL' as const, label: 'All' }, ...OUTCOME_FILTERS];
  return (
    <nav aria-label="Outcome" className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
      <ul className="flex gap-1.5 md:flex-wrap">
        {chips.map(({ value, label }) => (
          <li key={value} className="shrink-0">
            <Link
              href={runsHref({ ...query, reason: undefined, outcome: value === 'ALL' ? undefined : value }) as Route}
              prefetch={false}
              scroll={false}
              aria-current={current === value ? 'true' : undefined}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm whitespace-nowrap hover:bg-muted aria-[current]:border-foreground aria-[current]:bg-foreground aria-[current]:text-background"
            >
              {label}
              <span className="font-mono text-xs opacity-70">{countOf(value)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-5 py-10 text-center"
      data-runs-empty
    >
      <span className="font-semibold">{title}</span>
      <span className="max-w-md text-sm text-muted-foreground">{children}</span>
    </div>
  );
}

/**
 * Runs: the runs at work now (live from the poll), then the history: totals and the no-go breakdown over the filter,
 * the outcome chips, the other filters, and a page of the runs by day (20 a page, the page in the address). The URL
 * keeps the filters. `page` is `undefined` when the API does not answer it. A learner sees no spend.
 */
export function RunsScreen({
  view,
  page,
  query,
  number = 1,
  learner = false,
  activity,
  now,
}: {
  view: ContributeView;
  page: ContributeRunsPage | undefined;
  query: RunsQuery;
  /** The page of the history shown, from 1. */
  number?: number;
  learner?: boolean;
  activity?: ContributeActivity | null;
  now?: Date;
}) {
  let history: ReactNode;
  if (!page) {
    history = (
      <Empty title="Your runs are not available right now">
        The list comes back on its own. The runs at work now still show above.
      </Empty>
    );
  } else if (!page.items.length && !isFiltered(query) && !page.repos.length) {
    history = (
      <Empty title="No runs yet">
        An agent starts on an issue for you as your limits allow. Each run shows here, with what it found and what it
        cost.{' '}
        <Link href="/contribute/issues" prefetch={false} className="font-semibold text-link">
          See the issues picked for you
        </Link>
      </Empty>
    );
  } else {
    history = (
      <>
        <RunsTiles totals={page.totals} variant="history" learner={learner} />
        <NoGoBreakdown totals={page.totals} query={query} learner={learner} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OutcomeChips page={page} query={query} />
          <RunsFilters query={query} repos={page.repos} />
        </div>
        {page.items.length ? (
          <>
            <RunsList runs={page.items} days={page.days} cost={!learner} now={now} />
            <Pagination
              page={number}
              pageSize={RUNS_PAGE_SIZE}
              total={page.totals.runs}
              noun="run"
              hrefOf={(each) => runsHref(query, each) as Route}
            />
          </>
        ) : !isFiltered(query) ? (
          <Empty title="No runs in the last 30 days">
            <Link
              href={runsHref({ ...query, range: 'all' }) as Route}
              prefetch={false}
              scroll={false}
              className="font-semibold text-link"
            >
              See every run
            </Link>
          </Empty>
        ) : (
          <Empty title="No runs match these filters">
            Try a wider date range or another outcome.{' '}
            <Link href={RUNS_PATH} prefetch={false} scroll={false} className="font-semibold text-link">
              Clear the filters
            </Link>
          </Empty>
        )}
      </>
    );
  }

  return (
    <>
      <ContributeNotices notices={contributeNoticesOf(view)} />
      <SettingsPageHead
        title="Runs"
        text={`Every run ${learner ? 'your agent' : 'an agent'} made for you, newest first. Times are UTC.`}
        back="agent"
      />
      <WorkingNowSection activity={activity} />
      <section aria-labelledby="runs-history" className="flex flex-col gap-4" data-section="runs-history">
        <h2 id="runs-history" className={HEADING.section}>
          History
        </h2>
        {history}
      </section>
    </>
  );
}
