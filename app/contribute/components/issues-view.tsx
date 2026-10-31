import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { AgentNextSteps } from './agent-connected';
import { ContributeNotices } from './contribute-notices';
import { FirstRunGuide } from './first-run-guide';
import { IssueCard } from './issue-card';
import { filterOf, type IssuesQuery, issuesHref, issuesQueryOf } from './issues-filter';
import { IssuesFilters } from './issues-filters';
import { ModeSwitcher, OtherIssuesDivider, SetIssuesHeading, SetOnlyEmpty } from './issues-mode';
import { Meter } from './primitives';
import { ReviewsReady } from './reviews-ready';
import { StillRanking } from './still-ranking';
import {
  loadAttempts,
  loadContribute,
  loadContributeSet,
  loadIssues,
  loadIssueTiers,
} from '@/lib/contribute/contribute.data';
import type {
  ContributeAttempt,
  ContributeIssuePage,
  ContributeSet,
  ContributeView,
} from '@/lib/contribute/contribute.types';
import { contributeNoticesOf, isContributePageOpen, isOwnAgentOnly } from '@/lib/contribute/contribute-state';
import {
  agentFirstRunStepOf,
  firstRunNoticesOf,
  firstRunStepOf,
  isAgentFirstRun,
  isFirstRun,
} from '@/lib/contribute/first-run';
import { dayLabel, relativeLabel, usd } from '@/lib/contribute/format';
import { tiersOf } from '@/lib/contribute/set-format';

export async function IssuesView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = issuesQueryOf(await searchParams);
  const [view, loaded, reviews, latest, set] = await Promise.all([
    loadContribute(),
    loadIssues(filterOf(query), query.after),
    loadAttempts('REVIEW', 5),
    loadAttempts(undefined, 1),
    loadContributeSet(),
  ]);
  if (!view) notFound();
  if (!isContributePageOpen(view, 'issues')) redirect('/contribute');
  const firstRun = isFirstRun(view, latest);
  // Each issue's tier, read only where the page splits the feed by it: a mode with a list of its own.
  const tiers =
    set && set.mode !== 'ALL' && loaded?.items.length ? await loadIssueTiers(filterOf(query), query.after) : undefined;
  const page =
    loaded && tiers
      ? { ...loaded, items: loaded.items.map((issue) => ({ ...issue, tier: tiers.get(issue.issueId) })) }
      : loaded;
  return (
    <IssuesScreen
      view={view}
      page={page}
      set={set}
      query={query}
      reviews={reviews}
      firstRun={firstRun}
      agentFirstRun={!firstRun && isOwnAgentOnly(view) && isAgentFirstRun(view, latest)}
    />
  );
}

const filtered = (query: IssuesQuery) => !!(query.language || query.kind || query.size);

/** The user's mode works on its own list alone, and waits when it has nothing ready. */
const setOnly = (set: ContributeSet) => (set.mode === 'STACK' ? set.stack.fallback : set.repos.fallback) === 'SET_ONLY';

function Empty({ title, text }: { title: string; text: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-dashed px-5 py-8 text-center">
      <span className="font-semibold">{title}</span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

/**
 * The feed: issues picked for the user, with filters and Skip. `page` is `undefined` when the API does not answer the
 * feed yet, and `null` when it has none for the user.
 */
export function IssuesScreen({
  view,
  page,
  query,
  now,
  reviews,
  firstRun = false,
  agentFirstRun = false,
  set,
}: {
  view: ContributeView;
  page: ContributeIssuePage | null | undefined;
  query: IssuesQuery;
  now?: Date;
  /** The attempts waiting for the user's review; `undefined` while the API does not answer them. */
  reviews?: ContributeAttempt[];
  /** No attempt yet: the page opens with what happens next. */
  firstRun?: boolean;
  /** The user's own agent has made no attempt yet: the page opens with its next steps. */
  agentFirstRun?: boolean;
  /** What the user works on; null or `undefined` when the modes are not shown, and then nothing about them is. */
  set?: ContributeSet | null;
}) {
  const spend = view.contributor?.spend;
  const settings = view.contributor?.settings;

  let feed: React.ReactNode;
  if (page === undefined) {
    feed = <Empty title="Issues are not available yet" text="The feed is coming soon. Check back shortly." />;
  } else if (page && !page.computedAt && !page.items.length && !filtered(query)) {
    // The first picks are computed after the key is connected: the page reads itself again until they are in.
    feed = <StillRanking />;
  } else if (!page?.items.length && set && set.mode !== 'ALL' && setOnly(set) && !filtered(query) && !query.after) {
    feed = (
      <SetOnlyEmpty
        set={set as ContributeSet & { mode: 'STACK' | 'REPOS' }}
        languages={view.contributor?.preferences?.languages ?? []}
      />
    );
  } else if (!page?.items.length) {
    feed = filtered(query) ? (
      <Empty
        title="No issues match these filters"
        text={
          <Link href="/contribute/issues" prefetch={false} className="font-semibold text-link">
            Clear the filters
          </Link>
        }
      />
    ) : (
      <Empty
        title="No issues picked for you yet"
        text={
          <>
            New picks arrive every day. Widen what you work on in{' '}
            <Link href="/contribute/settings#work" prefetch={false} className="font-semibold text-link">
              Settings
            </Link>
            .
          </>
        }
      />
    );
  } else {
    const split = set ? tiersOf(page.items, set.mode) : null;
    feed = (
      <>
        {split && set ? (
          <>
            {split.set.length ? <SetIssuesHeading set={set} /> : null}
            {split.set.map((issue, index) => (
              <IssueCard key={issue.issueId} issue={issue} best={index === 0 && !query.after} />
            ))}
            {split.other.length ? <OtherIssuesDivider set={set} none={!split.set.length && !query.after} /> : null}
            {split.other.map((issue) => (
              <IssueCard key={issue.issueId} issue={issue} other />
            ))}
          </>
        ) : (
          page.items.map((issue, index) => (
            <IssueCard key={issue.issueId} issue={issue} best={index === 0 && !query.after} />
          ))
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          {query.after ? (
            <Link href={issuesHref({ ...query, after: undefined }) as Route} prefetch={false} className="text-link">
              ← Back to the best matches
            </Link>
          ) : (
            <span />
          )}
          {page.next ? (
            <Link
              href={issuesHref({ ...query, after: page.next }) as Route}
              prefetch={false}
              className="font-semibold text-link"
            >
              More issues →
            </Link>
          ) : null}
        </div>
      </>
    );
  }

  // Only the unfiltered first page says whether anything is picked at all.
  const guidePage = query.after || filtered(query) ? undefined : page;
  const notices = firstRun
    ? firstRunNoticesOf(contributeNoticesOf(view), firstRunStepOf(view, guidePage, now))
    : agentFirstRun
      ? firstRunNoticesOf(contributeNoticesOf(view), agentFirstRunStepOf(view))
      : contributeNoticesOf(view);
  const guided = firstRun || agentFirstRun;
  const Heading = guided ? 'h2' : 'h1';

  return (
    <>
      <ContributeNotices notices={notices} />
      {firstRun ? <FirstRunGuide view={view} page={guidePage} now={now} heading="h1" /> : null}
      {agentFirstRun ? <AgentNextSteps view={view} heading="h1" /> : null}
      <ReviewsReady attempts={reviews} />
      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Heading className={guided ? 'text-xl font-bold' : 'text-2xl font-bold tracking-tight'}>
                  {guided ? 'Picked for you' : 'Issues for you'}
                </Heading>
                {set ? <ModeSwitcher set={set} /> : null}
              </div>
              <span className="text-sm text-muted-foreground" data-total={page?.total ?? ''}>
                {page
                  ? `${page.total.toLocaleString('en-US')} open issue${page.total === 1 ? '' : 's'} match your languages and topics. Maintainers agreed each one should be fixed.`
                  : 'Open issues that match your languages and topics, in repos that merge outside work.'}
                {page?.computedAt ? ` Picked ${relativeLabel(page.computedAt, now)}.` : ''}
              </span>
            </div>
            <IssuesFilters query={query} />
          </div>
          {feed}
        </div>
        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <section className="flex flex-col gap-2.5 rounded-xl border bg-card p-4.5">
            <h2 className="text-base font-semibold">This cycle</h2>
            {spend && settings ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold">{usd(spend.cycleUsd)}</span>
                  <span className="text-sm text-muted-foreground">of {usd(settings.cycleCapUsd)}</span>
                </div>
                <Meter value={spend.cycleUsd} max={settings.cycleCapUsd} label="Spent this cycle" />
                <span className="text-sm text-muted-foreground">
                  Renews {dayLabel(spend.cycleEnd)}.
                  {spend.nextAttemptAt ? ` The next attempt can start ${relativeLabel(spend.nextAttemptAt, now)}.` : ''}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Nothing is spent until a key is connected.{' '}
                <Link href="/contribute/connect" prefetch={false} className="font-semibold text-link">
                  Connect Claude
                </Link>
              </span>
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5">
            <h2 className="text-base font-semibold">How picks work</h2>
            <span className="text-sm text-muted-foreground">
              Issues come from active repos that merge outside work, matched to your languages and topics. Skip one and
              it is not picked for you again. Size is shown where it is known.
            </span>
          </section>
        </aside>
      </div>
    </>
  );
}
