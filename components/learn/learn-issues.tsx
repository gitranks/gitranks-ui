import Link from 'next/link';
import type { ReactNode } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { HEADING } from '@/components/workspace/primitives';
import type { LearnGoalView, LearnIssue, LearnIssues, LearnRoom } from '@/lib/learn/learn.types';
import { goalValueOf, issueSizeOf, roomWordsOf } from '@/lib/learn/learn-home';
import { cn } from '@/lib/utils';
import { githubUrlOf } from '@/lib/workspace/attempt-format';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { learnStartPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { isOpenPrsLimit } from '@/lib/workspace/start/start-page';

/** A Start button's look: the first row's is the page's one primary action. */
export type StartLook = { label: string; primary: boolean };

/**
 * An issue a lesson can be written for, as Contribute's issue row draws it (where and how big, what, why it was picked)
 * with Start in place of Skip. `start` is null while the viewer has no room for a new lesson: the row stays, as a preview.
 */
export function LearnIssueRow({
  issue,
  start,
  source,
}: {
  issue: LearnIssue;
  start: StartLook | null;
  source: ContributeSource;
}) {
  const url = githubUrlOf(issue.url);
  const title = issue.title.trim() || `Issue #${issue.number}`;
  const size = issueSizeOf(issue);
  const why = issue.why?.trim();
  const where = `${issue.repo}#${issue.number}`;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5" data-learn-issue={where}>
      <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono break-all text-foreground/80">
            {issue.repo} · #{issue.number}
          </span>
          {issue.language ? <span>{issue.language}</span> : null}
          {size ? <span data-size={issue.size}>{size}</span> : null}
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-pretty text-foreground hover:underline"
          >
            {title}
          </a>
        ) : (
          <span className="font-semibold text-pretty text-foreground">{title}</span>
        )}
        {why ? (
          <span className="text-sm text-muted-foreground" data-why="">
            <span className="sr-only">Why it was picked: </span>
            {why}
          </span>
        ) : null}
      </div>
      {start ? (
        <Button
          asChild
          variant={start.primary ? 'default' : 'outline'}
          className={cn('min-h-11 max-sm:w-full', start.primary ? 'px-5 font-semibold' : 'px-4')}
        >
          <Link
            href={learnStartPath(issue.repo, issue.number)}
            prefetch={false}
            aria-label={`${start.label}: ${where}`}
            {...contributeSource(source)}
          >
            {start.label}
          </Link>
        </Button>
      ) : null}
    </li>
  );
}

/** "For your goal: TypeScript · Some · Change": the goal the list is for, and the way to change it. */
export function GoalChips({ goal }: { goal: LearnGoalView }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-goal-chips="">
      For your goal:
      <Pill tone="violet">{goalValueOf(goal)}</Pill>
      {goal.level ? <Pill tone="violet">{goal.level}</Pill> : null}
      <Link
        href={WORKSPACE_PATHS.settingsGoal}
        prefetch={false}
        className="font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        Change
      </Link>
    </span>
  );
}

/** A note in the list's place: why there is nothing to start, and what to do. */
function ListNote({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return (
    <div data-issues-empty={id} className="flex flex-col items-start gap-2 rounded-xl border bg-card px-4 py-3.5">
      {title ? <span className="font-semibold">{title}</span> : null}
      {children}
    </div>
  );
}

const ChangeGoal = ({ primary = false }: { primary?: boolean }) => (
  <Button asChild variant={primary ? 'default' : 'outline'} className="min-h-11 font-semibold max-sm:w-full">
    <Link href={WORKSPACE_PATHS.settingsGoal} prefetch={false}>
      Change your goal
    </Link>
  </Button>
);

/** The day's cap on new issues, in the words Contribute's feed uses there. */
const CAP_TITLE = 'That’s today’s new issues';
const CAP_TEXT = 'You’ve seen the most new issues we show in a day. More arrive at 00:00 UTC.';
/** Under a list the cap cut short: the issues already shown stay. */
const CAP_KEEPS = 'The ones you’ve seen stay here until then.';

/** Why the list is empty, worded apart for each reason; `goal` is what the viewer wants to learn. */
export function IssuesEmpty({ issues, goal }: { issues: LearnIssues | undefined; goal: string }) {
  switch (issues?.empty) {
    case 'NONE_TODAY':
      return (
        <ListNote id="none-today">
          <p className="text-sm text-muted-foreground">
            No open issues fit {goal || 'your goal'} today. New ones come in every day.
          </p>
          <ChangeGoal />
        </ListNote>
      );
    case 'GOAL_UNSUPPORTED':
      return (
        <ListNote id="goal-unsupported">
          <p className="text-sm text-muted-foreground">Learn can’t find issues for this goal yet.</p>
          <ChangeGoal primary />
        </ListNote>
      );
    case 'CAP':
      return (
        <ListNote id="cap" title={CAP_TITLE}>
          <p className="text-sm text-muted-foreground">{CAP_TEXT}</p>
        </ListNote>
      );
    default:
      return (
        <ListNote id="unread">
          <p className="text-sm text-muted-foreground">Couldn’t load the issues. Try again in a minute.</p>
        </ListNote>
      );
  }
}

/** No room for a new lesson: the limit's words in place of the Start buttons. */
export function RoomNote({ room }: { room: LearnRoom }) {
  if (isOpenPrsLimit(room.limit)) {
    return (
      <div data-room={room.limit}>
        <LimitNotice count={room.value} limit={room.value} />
      </div>
    );
  }
  const words = roomWordsOf(room);
  return (
    <p
      data-room={room.limit}
      className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      {words.text}{' '}
      <Link href={words.link.href} prefetch={false} className="font-semibold text-link hover:underline">
        {words.link.label}
      </Link>
    </p>
  );
}

/**
 * Learn home's issues (`#issues`): the heading and its line, the goal they are for, then the rows with Start (the first
 * one primary, `first`), or why there are none. With no room for a new lesson the rows stay without Start, under the
 * limit's words. `issues` is undefined when the API did not answer.
 */
export function LearnIssuesSection({
  issues,
  goal,
  title,
  text,
  first,
}: {
  issues: LearnIssues | undefined;
  /** The viewer's goal, from their profile when the list did not answer one. */
  goal: LearnGoalView | null;
  title: string;
  text: ReactNode;
  /** The first row's button label. */
  first: string;
}) {
  const shown = issues?.goal ?? goal;
  const items = issues?.items ?? [];
  const room = issues?.room ?? null;
  return (
    <section aria-labelledby="issues-title" id="issues" className="flex scroll-mt-4 flex-col gap-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="issues-title" className={HEADING.section}>
            {title}
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
        </div>
        {shown ? <GoalChips goal={shown} /> : null}
      </div>
      {room && items.length ? <RoomNote room={room} /> : null}
      {items.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((issue, index) => (
            <LearnIssueRow
              key={issue.issueId}
              issue={issue}
              source="learn_home_issue"
              start={room ? null : { label: index === 0 ? first : 'Start', primary: index === 0 }}
            />
          ))}
        </ul>
      ) : (
        <IssuesEmpty issues={issues} goal={goalValueOf(shown)} />
      )}
      {items.length && issues?.capReached ? (
        <p className="text-sm text-muted-foreground" data-issues-cap="">
          {CAP_TITLE}. {CAP_TEXT} {CAP_KEEPS}
        </p>
      ) : null}
    </section>
  );
}
