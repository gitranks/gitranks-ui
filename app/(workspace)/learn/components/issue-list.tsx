'use client';

import type { Route } from 'next';
import { type ReactNode, useState, useTransition } from 'react';

import { LearnCapNote, LearnHeldNote, LearnIssuesEmpty, LearnRoomNote } from '@/components/learn/learn-issue-notes';
import { IssueRow } from '@/components/workspace/issue-row';
import { ShowMore } from '@/components/workspace/show-more';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { readLearnIssues } from '@/lib/learn/actions';
import type { LearnIssue, LearnIssues } from '@/lib/learn/learn.types';
import { goalValueOf } from '@/lib/learn/learn-home';
import { grownTo, LEARN_ISSUES_FIRST, LEARN_ISSUES_MAX } from '@/lib/learn/learn-tab';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { type ConnectedAgents, issueRowOfLearn } from '@/lib/workspace/issue-row';
import type { IssueRef } from '@/lib/workspace/paths';

/** A Learn row's Start a lesson leads to the Start page in lesson mode; no agent is offered. */
const NO_AGENTS: ConnectedAgents = { hosted: false, own: false };

export type LearnIssueListProps = {
  /** The first read of the issues for the goal; undefined when the API did not answer it. */
  issues: LearnIssues | undefined;
  /** Where each row's Start a lesson leads; the Start page in lesson mode by default. */
  startHref?: (ref: IssueRef) => Route;
  /** The first row's Start is the view's primary button: false when the page holds its primary elsewhere. */
  primary?: boolean;
  /** GitRanks holds the account: its notice, no rows, no Start. */
  held?: boolean;
  /** "Show 10 more": false leaves it out (a list placed for a visitor, or a short preview). */
  more?: boolean;
  /** Where a click on a row's Start counts as coming from. */
  source?: ContributeSource;
  className?: string;
};

/**
 * Learn's issues for the viewer's goal, without the tab's heading and goal chips: the held account's notice, or the
 * limit that leaves no room for a new lesson over rows without Start, then the rows (`IssueRow`, Start a lesson), and
 * "Show 10 more". Or why there are none, each with one next step. It reads nothing of the viewer itself until "Show 10
 * more" is pressed, so a page can show it to a visitor (with `more={false}`).
 */
export function LearnIssueList({
  issues,
  startHref,
  primary = true,
  held = false,
  more = true,
  source,
  className,
}: LearnIssueListProps) {
  let body: ReactNode;
  if (held) {
    body = <LearnHeldNote />;
  } else if (!issues?.items.length) {
    body = <LearnIssuesEmpty issues={issues} goal={goalValueOf(issues?.goal)} />;
  } else {
    body = (
      <GrowingRows
        // Another goal is another list: it starts again at its first 10.
        key={goalValueOf(issues.goal)}
        issues={issues}
        startHref={startHref}
        primary={primary}
        more={more}
      />
    );
  }
  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      data-learn-issue-list=""
      {...(source ? contributeSource(source) : {})}
    >
      {body}
    </div>
  );
}

/**
 * The rows, and "Show 10 more": the list is ordered again on each read, so it is read again with a larger `first`
 * (20, 30, … up to 100) and only the rows not shown yet are added under the others; rows already there never move. A
 * read that adds nothing ends it; the count line stays.
 */
function GrowingRows({
  issues,
  startHref,
  primary,
  more,
}: Required<Pick<LearnIssueListProps, 'primary' | 'more'>> &
  Pick<LearnIssueListProps, 'startHref'> & { issues: LearnIssues }) {
  // Only what "Show 10 more" added is kept here: the page's own read (it reads itself again) shows its rows first.
  const [added, setAdded] = useState<LearnIssue[]>([]);
  const [asked, setAsked] = useState(Math.max(issues.items.length, LEARN_ISSUES_FIRST));
  const [ended, setEnded] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const shownIds = new Set(issues.items.map(({ issueId }) => issueId));
  const rows = [...issues.items, ...added.filter(({ issueId }) => !shownIds.has(issueId))];
  const total = Math.max(issues.total, rows.length);
  const room = issues.room;
  const growing = more && !ended && asked < LEARN_ISSUES_MAX && rows.length < total;

  const showMore = () =>
    startTransition(async () => {
      setFailed(false);
      const first = grownTo(asked, LEARN_ISSUES_MAX);
      const result = await readLearnIssues(first).catch(() => null);
      if (!result?.ok) {
        setFailed(true);
        return;
      }
      const held = new Set(rows.map(({ issueId }) => issueId));
      const fresh = result.data.items.filter(({ issueId }) => !held.has(issueId));
      setAsked(first);
      setAdded((before) => [...before, ...fresh]);
      if (result.data.capReached) setCapReached(true);
      if (!fresh.length) setEnded(true);
    });

  return (
    <IssueStartsProvider>
      {room ? <LearnRoomNote room={room} /> : null}
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {rows.map((issue, index) => {
          const row = issueRowOfLearn(issue);
          return (
            <li key={issue.issueId}>
              <IssueRow
                issue={row}
                side="learn"
                agents={NO_AGENTS}
                primary={primary && index === 0}
                control={!room}
                startHref={startHref?.({ repo: row.repo, issue: row.number })}
              />
            </li>
          );
        })}
      </ul>
      {issues.capReached || capReached ? <LearnCapNote /> : null}
      {growing ? (
        <ShowMore shown={rows.length} total={total} noun="issue" pending={pending} onMore={showMore} />
      ) : more && rows.length < total ? (
        <p className="text-sm text-muted-foreground" data-show-more-ended="">
          Showing {rows.length} of {total} {total === 1 ? 'issue' : 'issues'}
        </p>
      ) : null}
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t load more. Try again in a minute.
        </p>
      ) : null}
    </IssueStartsProvider>
  );
}
