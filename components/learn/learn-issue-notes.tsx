'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { LimitNotice } from '@/components/workspace/limit-notice';
import type { LearnIssues, LearnRoom } from '@/lib/learn/learn.types';
import { CONTACT_EMAIL } from '@/lib/legal';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { isOpenPrsLimit } from '@/lib/workspace/start/start-page';
import { busyText } from '@/lib/workspace/start-refusals';

const link = 'font-semibold text-link hover:underline';

/** A note in the list's place: why there is nothing to start, and what to do. */
function ListNote({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return (
    <div data-issues-empty={id} className="flex flex-col items-start gap-2 rounded-xl border bg-card px-4 py-3.5">
      {title ? <span className="font-semibold">{title}</span> : null}
      {children}
    </div>
  );
}

/** Where Change your goal leads by default: the goal's page in Settings. Learn's flow sends it to Your goal. */
const GOAL_PAGE = WORKSPACE_PATHS.settingsGoal;

const ChangeGoal = ({ primary = false, href = GOAL_PAGE }: { primary?: boolean; href?: Route }) => (
  <Button asChild variant={primary ? 'default' : 'outline'} className="min-h-11 font-semibold max-sm:w-full">
    <Link href={href} prefetch={false}>
      Change your goal
    </Link>
  </Button>
);

/**
 * Why the list is empty, worded apart for each reason; `goal` is what the viewer wants to learn, `changeHref` where
 * changing it leads. `issues` undefined: the API did not answer, and the note offers to read the page again.
 */
export function LearnIssuesEmpty({
  issues,
  goal,
  changeHref = GOAL_PAGE,
}: {
  issues: LearnIssues | undefined;
  goal: string;
  changeHref?: Route;
}) {
  const router = useRouter();
  switch (issues?.empty) {
    case 'NONE_TODAY':
      return (
        <ListNote id="none-today">
          <p className="text-sm text-muted-foreground">
            No open issues fit {goal || 'your goal'} today. New ones come in every day.
          </p>
          <ChangeGoal href={changeHref} />
        </ListNote>
      );
    case 'GOAL_UNSUPPORTED':
      return (
        <ListNote id="goal-unsupported">
          <p className="text-sm text-muted-foreground">Learn can’t find issues for this goal yet.</p>
          <ChangeGoal primary href={changeHref} />
        </ListNote>
      );
    default:
      return (
        <ListNote id="unread">
          <p className="text-sm text-muted-foreground">Couldn’t load the issues. Try again in a minute.</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.refresh()}
            className="min-h-11 font-semibold max-sm:w-full"
          >
            Try again
          </Button>
        </ListNote>
      );
  }
}

/** A visitor's day list for `language` is empty: none is ready today, and the goal can be changed. */
export function LearnNoneReady({ language, changeHref }: { language: string; changeHref: Route }) {
  return (
    <ListNote id="none-today">
      <p className="text-sm text-muted-foreground">
        No open {language} issues are ready today. New ones come in every day.
      </p>
      <ChangeGoal href={changeHref} />
    </ListNote>
  );
}

/**
 * No room for a new lesson: the open pull request limit in its one wording, or the runs at a time in the sentence a
 * refused Start says (the place may be held by either agent), with the way to the pull requests.
 */
export function LearnRoomNote({ room }: { room: LearnRoom }) {
  if (isOpenPrsLimit(room.limit)) {
    return (
      <div data-room={room.limit}>
        <LimitNotice count={room.value} limit={room.value} />
      </div>
    );
  }
  return (
    <p
      data-room={room.limit}
      className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
      role="status"
    >
      {busyText(room.value)}{' '}
      <Link href={WORKSPACE_PATHS.pullRequests} prefetch={false} className={link}>
        Pull requests
      </Link>
    </p>
  );
}

/** GitRanks holds the account: no issues are shown, and the way to ask why. */
export function LearnHeldNote() {
  return (
    <ListNote id="held" title="No issues for now">
      <p className="text-sm text-muted-foreground">
        Learn is paused for this account, so no issues are shown.{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className={link}>
          Write to us
        </a>
      </p>
    </ListNote>
  );
}
