import { ArrowRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnPill } from './learn-pill';
import { ListSection } from './list-row';
import { InProgressRow, NeedsYouRow } from './needs-you-row';
import { Pagination } from './pagination';
import { HEADING, PageTitle } from './primitives';
import { PullRequestStatePill } from './pull-request-state-pill';
import { RefChips } from './ref-chips';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { costOrAgentOf, isOwnAgent } from '@/lib/workspace/attempt-format';
import { audienceOf } from '@/lib/workspace/audience';
import type {
  ContributeActivity,
  ContributeNeedsYouAnswer,
  ContributePullRequestsPage,
  ContributeSides,
} from '@/lib/workspace/contribute.types';
import { dayLabel, relativeLabel, usd } from '@/lib/workspace/format';
import { type LimitCounts, limitLineOf } from '@/lib/workspace/limit-words';
import { needsYouEntryOf, needsYouWordsOf } from '@/lib/workspace/needs-you-words';
import {
  PULL_REQUESTS_PAGE_SIZE,
  type PullRequestsFilter,
  pullRequestByAttemptPath,
  pullRequestsPath,
  WORKSPACE_ANCHORS,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';

/** What the tab shows: who the user is on each side, what waits on them, and a page of their pull requests. */
export type PullRequestsData = {
  /** Which sides the user uses; unknown: both. */
  sides: ContributeSides | null | undefined;
  /** Learn is open to the account: its card, its pill and the "Made with" filter. */
  learnOpen: boolean;
  /** The limit's line: what it counts, the limit, and the open ones; undefined when not known. */
  limit?: LimitCounts;
  /** What waits on the user; null when the API does not answer it, undefined when the read failed. */
  needsYou: ContributeNeedsYouAnswer | null | undefined;
  /** A page of the pull requests under the filters; undefined when the read failed. */
  page: ContributePullRequestsPage | undefined;
  filter: PullRequestsFilter;
  /** The work in progress the poll reads, for the live phase of an agent at work. */
  activity?: ContributeActivity | null;
  now: Date;
};

/** The title and the limit's line: "3 of 8 open at a time · Change in Settings". */
function Head({ limit, text }: { limit?: LimitCounts; text?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <PageTitle title="Pull requests" />
      {text ? (
        <p className="text-sm text-muted-foreground">{text}</p>
      ) : limit ? (
        <p className="text-sm text-muted-foreground" data-limit-line={limit.count}>
          {limitLineOf(limit)} ·{' '}
          <Link href={WORKSPACE_ANCHORS.limitRow} prefetch={false} className="font-semibold text-link hover:underline">
            Change in Settings
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Nothing yet: one card per side the account may start on, the one it is more likely to want first primary. */
function Empty({ learnOpen, sides }: { learnOpen: boolean; sides: ContributeSides | null | undefined }) {
  // Learn's card leads unless the account uses Contribute alone.
  const learnFirst = learnOpen && sides?.learn !== false;
  const cards = [
    {
      side: 'contribute',
      eyebrow: 'Contribute',
      title: 'Fix an issue',
      text: 'For developers who want merged pull requests: an agent fixes an issue you pick, you review the change, and the pull request opens in your name.',
      href: WORKSPACE_PATHS.contribute,
      label: 'Start contributing',
    },
    ...(learnOpen
      ? [
          {
            side: 'learn',
            eyebrow: 'Learn',
            title: 'Learn from a fix',
            text: 'For people who want to understand a real fix: your own agent fixes an issue you pick and writes a lesson on it, and the pull request opens once you pass the lesson.',
            href: WORKSPACE_PATHS.learn,
            label: 'Start learning',
          },
        ]
      : []),
  ];
  const primary = cards.length === 1 ? cards[0].side : learnFirst ? 'learn' : 'contribute';
  return (
    <section aria-labelledby="first-one" className="flex flex-col gap-3" data-section="empty">
      <h2 id="first-one" className={HEADING.block}>
        {cards.length === 1 ? 'Send your first one' : 'Two ways to send your first one'}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.side}
            className="flex flex-col items-start gap-2 rounded-xl border bg-card p-5"
            data-card={card.side}
          >
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{card.eyebrow}</span>
            <h3 className={HEADING.card}>{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.text}</p>
            <Button
              asChild
              variant={card.side === primary ? 'default' : 'outline'}
              className="mt-2 min-h-11 gap-2 px-4 font-semibold"
            >
              <Link href={card.href} prefetch={false}>
                {card.label}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** What waits on the user when its read failed: no row, and the line to reload. */
const UNREAD: ContributeNeedsYouAnswer = { count: 0, items: [], inProgress: [], complete: false };

/** What waits on the user: one row per item, the first row's button the view's one primary. */
function NeedsYouBlock({
  answer,
  learnPill,
  now,
}: {
  answer: ContributeNeedsYouAnswer;
  learnPill: boolean;
  now: Date;
}) {
  const entries = answer.items.map(needsYouEntryOf);
  if (!entries.length && answer.complete) return null;
  return (
    <section
      aria-labelledby="needs-you"
      data-section="needs-you"
      className="overflow-hidden rounded-xl border border-warning/30 bg-card"
    >
      <h2
        id="needs-you"
        className={cn(
          HEADING.card,
          'border-b border-warning/30 bg-warning-soft px-5 py-3.5 text-warning-soft-foreground',
        )}
      >
        Needs you{entries.length ? ` · ${entries.length}` : ''}
      </h2>
      {entries.length ? (
        <ul>
          {entries.map((entry, index) => (
            <NeedsYouRow
              key={entry.key}
              entry={entry}
              words={needsYouWordsOf(entry, now)}
              primary={index === 0}
              learnPill={learnPill}
            />
          ))}
        </ul>
      ) : null}
      {answer.complete ? null : (
        <p className="px-5 py-3 text-sm text-muted-foreground" data-needs-incomplete="">
          Some of what waits for you didn&apos;t load. Reload to see the rest.
        </p>
      )}
    </section>
  );
}

/** The work under way: not counted, never paged. */
function InProgressBlock({
  answer,
  learnPill,
  activity,
  now,
}: {
  answer: ContributeNeedsYouAnswer;
  learnPill: boolean;
  activity?: ContributeActivity | null;
  now: Date;
}) {
  const entries = answer.inProgress.map(needsYouEntryOf);
  if (!entries.length) return null;
  return (
    <ListSection id="in-progress" title="In progress" count={entries.length}>
      {entries.map((entry) => (
        <InProgressRow
          key={entry.key}
          entry={entry}
          words={needsYouWordsOf(entry, now)}
          activity={activity}
          learnPill={learnPill}
        />
      ))}
    </ListSection>
  );
}

const CHIP =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm whitespace-nowrap hover:bg-muted aria-[current]:border-foreground aria-[current]:bg-foreground aria-[current]:text-background';
const SIDE =
  'inline-flex min-h-8 items-center rounded-md px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current]:bg-background aria-[current]:text-foreground aria-[current]:shadow-sm';

/** The state chips with their counts, and "Made with" for someone on both sides; links, each back to page 1. */
function Filters({
  page,
  filter,
  sideFilter,
}: {
  page: ContributePullRequestsPage;
  filter: PullRequestsFilter;
  sideFilter: boolean;
}) {
  const side = filter.made === 'learn' ? page.totals.byMode?.learn : filter.made ? page.totals.byMode?.fix : null;
  const counts = side ?? page.totals;
  const chips = [
    { state: undefined, label: 'All', count: counts.open + counts.merged + counts.closed },
    { state: 'open' as const, label: 'Open', count: counts.open },
    { state: 'merged' as const, label: 'Merged', count: counts.merged },
    { state: 'closed' as const, label: 'Closed', count: counts.closed },
  ];
  const sides = [
    { made: undefined, label: 'All' },
    { made: 'contribute' as const, label: 'Contribute' },
    { made: 'learn' as const, label: 'Learn' },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="State" className="min-w-0 flex-[1_1_420px] overflow-x-auto [scrollbar-width:none]">
        <ul className="flex gap-1.5 md:flex-wrap">
          {chips.map((chip) => (
            <li key={chip.label} className="shrink-0">
              <Link
                href={pullRequestsPath({ made: filter.made, state: chip.state })}
                prefetch={false}
                scroll={false}
                aria-current={filter.state === chip.state ? 'true' : undefined}
                className={CHIP}
              >
                {chip.label}
                <span className="font-mono text-xs opacity-70">{chip.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {sideFilter ? (
        <nav aria-label="Made with" className="flex items-center gap-2.5">
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            Made with
          </span>
          <ul className="inline-flex gap-0.75 rounded-lg bg-muted p-0.75">
            {sides.map((each) => (
              <li key={each.label}>
                <Link
                  href={pullRequestsPath({ state: filter.state, made: each.made })}
                  prefetch={false}
                  scroll={false}
                  aria-current={filter.made === each.made ? 'true' : undefined}
                  className={SIDE}
                >
                  {each.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

type Row = ContributePullRequestsPage['items'][number];

/** "Passed 5 of 5" and the lesson's link: a Learn pull request's last column. */
function LessonCell({ row }: { row: Row }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {row.lesson ? (
        <span className="text-muted-foreground">
          Passed {row.lesson.stepsPassed} of {row.lesson.steps}
        </span>
      ) : null}
      <Link
        href={pullRequestByAttemptPath(row.attemptId, { view: 'lesson' })}
        prefetch={false}
        className="font-semibold text-link hover:underline"
      >
        Lesson
      </Link>
    </span>
  );
}

/** Who made it: the hosted agent and its cost, the user's own agent, or for Learn the pill and the lesson's link. */
function MadeWithCell({ row }: { row: Row }) {
  if (row.mode === 'LEARN') {
    return (
      <span className="inline-flex items-center gap-2.5">
        <LearnPill />
        <Link
          href={pullRequestByAttemptPath(row.attemptId, { view: 'lesson' })}
          prefetch={false}
          className="font-semibold text-link hover:underline"
        >
          Lesson
        </Link>
      </span>
    );
  }
  // A pull request opened by hand takes no run: the line says why.
  const byHand = row.openedBy === 'HAND' ? <div className="text-muted-foreground">opened by hand</div> : null;
  if (isOwnAgent(row)) {
    return (
      <>
        <span className="text-muted-foreground">Your own agent</span>
        {byHand}
      </>
    );
  }
  return (
    <>
      <span className="font-mono">
        <span className="font-sans text-muted-foreground">Hosted agent · </span>
        {costOrAgentOf(row, usd)}
      </span>
      {byHand}
    </>
  );
}

/** The table of pull requests: the title (its page), the chips, the state, the dates, who made it or the lesson. */
function PullRequestsTable({
  page,
  learner,
  learnPills,
  now,
}: {
  page: ContributePullRequestsPage;
  learner: boolean;
  learnPills: boolean;
  now: Date;
}) {
  return (
    <section aria-labelledby="all-pull-requests" className="overflow-hidden rounded-xl border bg-card">
      <h2 id="all-pull-requests" className="sr-only">
        All pull requests
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-155 border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium">Pull request</th>
              <th className="px-3 py-2.5 font-medium">State</th>
              <th className="px-3 py-2.5 font-medium">Dates</th>
              <th className="py-2.5 pr-5 pl-3 text-right font-medium">{learner ? 'Lesson' : 'Made with'}</th>
            </tr>
          </thead>
          <tbody>
            {page.items.map((row) => {
              const { pullRequest } = row;
              const ended = pullRequest.mergedAt ?? pullRequest.closedAt;
              return (
                <tr key={row.attemptId} data-pr={pullRequest.number} data-mode={row.mode ?? ''} className="border-t">
                  <td className="px-5 py-3 align-top">
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={pullRequestByAttemptPath(row.attemptId)}
                        prefetch={false}
                        className="font-medium text-foreground hover:underline"
                      >
                        {row.title?.trim() || `Fix for issue #${row.issueNumber}`}
                      </Link>
                      <RefChips
                        repo={row.nameWithOwner}
                        issue={row.issueNumber}
                        pr={{ number: pullRequest.number, url: pullRequest.url }}
                      >
                        {learnPills && row.mode === 'LEARN' ? <LearnPill /> : null}
                      </RefChips>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <PullRequestStatePill pullRequest={pullRequest} />
                  </td>
                  <td className="px-3 py-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                    <div>Opened {dayLabel(pullRequest.openedAt)}</div>
                    {ended ? (
                      <div>
                        {pullRequest.mergedAt ? 'Merged' : 'Closed'} {dayLabel(ended)}
                      </div>
                    ) : (
                      <div>{relativeLabel(pullRequest.syncedAt ?? pullRequest.openedAt, now)}</div>
                    )}
                  </td>
                  <td className="py-3 pr-5 pl-3 text-right align-top text-xs">
                    {learner ? <LessonCell row={row} /> : <MadeWithCell row={row} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The table's place when it has nothing to show, or did not load. */
function TableNote({ children, name }: { children: ReactNode; name: string }) {
  return (
    <p data-table-note={name} className="rounded-xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * The Pull requests tab: everything the user sent or is about to send to maintainers, and what each needs from them.
 * The title and the limit's line; Needs you (the API's list, each row worded here); In progress; the state chips and
 * "Made with"; the table, 20 a page.
 */
export function PullRequestsScreen({
  sides,
  learnOpen,
  limit,
  needsYou,
  page,
  filter,
  activity,
  now,
}: PullRequestsData) {
  const audience = audienceOf(sides, learnOpen);
  // Someone who only learns sees no Learn pill: every row is one.
  const learnPill = audience !== 'learner';
  const nothingWaits = !needsYou || (!needsYou.items.length && !needsYou.inProgress.length);
  const filtered = !!filter.state || !!filter.made;
  if (
    page &&
    !page.items.length &&
    !filtered &&
    (filter.page ?? 1) === 1 &&
    nothingWaits &&
    // Only a complete answer may say nothing waits: an unread one never shows the first-time cards.
    needsYou !== undefined &&
    needsYou?.complete !== false
  ) {
    return (
      <>
        <Head text="Every pull request you send shows here, with what it needs from you." />
        <Empty learnOpen={learnOpen} sides={sides} />
      </>
    );
  }
  const total = page ? (page.total ?? page.items.length) : 0;
  const current = filter.page ?? 1;
  return (
    <>
      <Head limit={limit} />
      {needsYou === undefined ? (
        <NeedsYouBlock answer={UNREAD} learnPill={learnPill} now={now} />
      ) : needsYou ? (
        <>
          <NeedsYouBlock answer={needsYou} learnPill={learnPill} now={now} />
          <InProgressBlock answer={needsYou} learnPill={learnPill} activity={activity} now={now} />
        </>
      ) : null}
      <div className="flex flex-col gap-3">
        {page ? <Filters page={page} filter={filter} sideFilter={audience === 'both'} /> : null}
        {!page ? (
          <TableNote name="unread">Your pull requests didn&apos;t load. Reload the page to try again.</TableNote>
        ) : page.items.length ? (
          <PullRequestsTable page={page} learner={audience === 'learner'} learnPills={audience === 'both'} now={now} />
        ) : (
          <TableNote name="none">
            No pull requests match.{' '}
            <Link
              href={WORKSPACE_PATHS.pullRequests}
              prefetch={false}
              className="font-semibold text-link hover:underline"
            >
              Show all
            </Link>
          </TableNote>
        )}
        {page ? (
          <Pagination
            page={current}
            pageSize={PULL_REQUESTS_PAGE_SIZE}
            total={total}
            noun="pull request"
            hrefOf={(next): Route => pullRequestsPath({ ...filter, page: next })}
          />
        ) : null}
      </div>
    </>
  );
}
