'use client';

import { type ReactNode, useState, useTransition } from 'react';

import { LearnCapNote, LearnHeldNote, LearnIssuesEmpty, LearnRoomNote } from '@/components/learn/learn-issue-notes';
import { IssueRow } from '@/components/workspace/issue-row';
import { ShowMore } from '@/components/workspace/show-more';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { useStableRows } from '@/components/workspace/use-stable-rows';
import { readLearnIssues } from '@/lib/learn/actions';
import type { LearnIssue, LearnIssues } from '@/lib/learn/learn.types';
import { goalValueOf } from '@/lib/learn/learn-home';
import {
  grownTo,
  LEARN_ISSUES_FIRST,
  LEARN_ISSUES_MAX,
  type LearnStartTarget,
  learnStartHrefOf,
} from '@/lib/learn/learn-tab';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { type ConnectedAgents, issueRowOfLearn } from '@/lib/workspace/issue-row';

/** A Learn row's Start a lesson leads to the Start page in lesson mode; no agent is offered. */
const NO_AGENTS: ConnectedAgents = { hosted: false, own: false };

export type LearnIssueListProps = {
  /** The first read of the issues for the goal; undefined when the API did not answer it. */
  issues: LearnIssues | undefined;
  /**
   * Where each row's Start a lesson leads: `base` + `/<owner>/<repo>/<issue>` + `query`, plain strings so a server page
   * can pass them. The Start page in lesson mode by default.
   */
  start?: LearnStartTarget;
  /** The first row's Start is the view's primary button: false when the page holds its primary elsewhere. */
  primary?: boolean;
  /** GitRanks holds the account: its notice, no rows, no Start. */
  held?: boolean;
  /** "Show 10 more": false leaves it out (a list placed for a visitor, or a short preview). */
  more?: boolean;
  /** Where a click on a row's Start counts as coming from (the rows only, never the notes' links). */
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
  start,
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
        start={start}
        primary={primary}
        more={more}
        source={source}
      />
    );
  }
  return (
    <div className={cn('flex flex-col gap-4', className)} data-learn-issue-list="">
      {body}
    </div>
  );
}

const issueKey = ({ issueId }: LearnIssue) => issueId;

/**
 * The rows, and "Show 10 more": the list is ordered again on each read, so it is read again with a larger `first`
 * (20, 30, … up to 100) and only the rows not shown yet are added under the others. Rows already there never move, a
 * new read of the page included. A read that adds nothing, or the day's cap, ends it; the count line stays.
 */
function GrowingRows({
  issues,
  start,
  primary,
  more,
  source,
}: Required<Pick<LearnIssueListProps, 'primary' | 'more'>> &
  Pick<LearnIssueListProps, 'start' | 'source'> & { issues: LearnIssues }) {
  const { rows, add } = useStableRows(issues.items, issueKey);
  const [asked, setAsked] = useState(Math.max(issues.items.length, LEARN_ISSUES_FIRST));
  const [ended, setEnded] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = Math.max(issues.total, rows.length);
  const room = issues.room;
  const capped = issues.capReached || capReached;
  const growing = more && !ended && !capped && asked < LEARN_ISSUES_MAX && rows.length < total;

  const showMore = () =>
    startTransition(async () => {
      setFailed(false);
      const first = grownTo(asked, LEARN_ISSUES_MAX);
      const result = await readLearnIssues(first).catch(() => null);
      if (!result?.ok) {
        setFailed(true);
        return;
      }
      setAsked(first);
      if (result.data.capReached) setCapReached(true);
      if (!add(result.data.items)) setEnded(true);
    });

  return (
    <IssueStartsProvider>
      {room ? <LearnRoomNote room={room} /> : null}
      <ul className="divide-y overflow-hidden rounded-xl border bg-card" {...(source ? contributeSource(source) : {})}>
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
                startHref={learnStartHrefOf({ repo: row.repo, issue: row.number }, start)}
              />
            </li>
          );
        })}
      </ul>
      {capped ? <LearnCapNote /> : null}
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
