import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { WorkingNowSection } from './agent-runs';
import { ContributeNotices } from './contribute-notices';
import { HEADING, PageTitle } from './primitives';
import { RunsFilters } from './runs-filters';
import { RunsList } from './runs-list';
import { loadContribute, loadContributeActivity } from '@/lib/contribute/contribute.data';
import type { ContributeActivity, ContributeView } from '@/lib/contribute/contribute.types';
import { contributeNoticesOf, isContributePageOpen } from '@/lib/contribute/contribute-state';
import { usd } from '@/lib/contribute/format';
import {
  type ContributeRunsPage,
  type ContributeRunsTotals,
  isFiltered,
  NO_GO_CATEGORIES,
  OUTCOME_FILTERS,
  percentLabel,
  type RunsQuery,
  runsFilterOf,
  runsHref,
  runsQueryOf,
} from '@/lib/contribute/runs';
import { loadRuns } from '@/lib/contribute/runs.data';
import { cn } from '@/lib/utils';

export async function RunsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = runsQueryOf(await searchParams);
  const now = new Date();
  const filter = runsFilterOf(query, now);
  const [view, page, activity] = await Promise.all([
    loadContribute(),
    loadRuns(filter),
    loadContributeActivity().catch(() => null),
  ]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'runs')) redirect('/contribute');
  return <RunsScreen view={view} page={page} query={query} activity={activity} from={filter.from} now={now} />;
}

function Tile({
  label,
  value,
  text,
  name,
  className,
}: {
  label: string;
  value: string;
  text: string;
  name: string;
  className?: string;
}) {
  return (
    <div
      data-total={name}
      className={cn('flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3.5', className)}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function Totals({ totals }: { totals: ContributeRunsTotals }) {
  const decided = totals.merged + totals.closed;
  const notStarted = totals.runs - totals.started;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile
        name="runs"
        label="Runs"
        value={totals.runs.toLocaleString('en-US')}
        text={notStarted ? `${notStarted} didn't start` : 'All reached the agent'}
      />
      <Tile
        name="spent"
        label="Spent"
        value={usd(totals.costUsd)}
        text={
          totals.started
            ? `${usd(Math.round((totals.costUsd / totals.started) * 100) / 100)} a started run`
            : 'Nothing yet'
        }
      />
      <Tile
        name="prs"
        label="Pull requests"
        value={String(totals.prs)}
        text={`${totals.merged} merged · ${totals.closed} closed · ${totals.prs - decided} open`}
      />
      <Tile
        name="merge-rate"
        label="Merge rate"
        value={percentLabel(totals.merged, decided)}
        text={`of ${decided} decided`}
      />
      {/* On phones the no-go card says the rate. */}
      <Tile
        name="no-go-rate"
        label="No-go rate"
        value={percentLabel(totals.noGo, totals.started)}
        text={`${totals.noGo} of ${totals.started} started · ${usd(totals.noGoCostUsd)}`}
        className="max-lg:hidden"
      />
    </div>
  );
}

/**
 * Why the agents said no-go: every no-go under the repo, runner and dates by category, whatever is picked; each part a
 * link that filters the list to it, and picked, back to every no-go.
 */
function NoGoBreakdown({ totals, query }: { totals: ContributeRunsTotals; query: RunsQuery }) {
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
          {!query.outcome && !query.reason ? (
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
 * Agent runs: the runs at work now (live from the poll), then the history: totals and the no-go breakdown over the
 * filter, the outcome chips, the other filters, and the runs by day with Load more. The URL keeps the filters.
 * `page` is `undefined` when the API does not answer it.
 */
export function RunsScreen({
  view,
  page,
  query,
  activity,
  from,
  now,
}: {
  view: ContributeView;
  page: ContributeRunsPage | undefined;
  query: RunsQuery;
  activity?: ContributeActivity | null;
  /** The first page's range start, for the pages Load more reads. */
  from?: string;
  now?: Date;
}) {
  const href = runsHref(query);
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
        <Totals totals={page.totals} />
        <NoGoBreakdown totals={page.totals} query={query} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <OutcomeChips page={page} query={query} />
          <RunsFilters query={query} repos={page.repos} />
        </div>
        {page.items.length ? (
          <RunsList key={href} page={page} href={href} from={from} now={now} />
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
            <Link href="/contribute/runs" prefetch={false} scroll={false} className="font-semibold text-link">
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
      <PageTitle title="Agent runs" text="Every run an agent made for you, newest first. Times are UTC." />
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
