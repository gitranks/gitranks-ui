'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LearnIssuesEmpty, LearnRoomNote } from './learn-issue-notes';
import { Button } from '@/components/ui/button';
import { IssueRow } from '@/components/workspace/issue-row';
import { MaskedList, MaskedListRow } from '@/components/workspace/masked-issue/masked-list';
import { HEADING } from '@/components/workspace/primitives';
import { useStableRows } from '@/components/workspace/use-stable-rows';
import { readPracticeNext } from '@/lib/learn/actions';
import type { LearnIssue, PracticeNext } from '@/lib/learn/learn.types';
import { attemptTitleOf, goalValueOf } from '@/lib/learn/learn-home';
import { LEARN_PRACTICE_PATH } from '@/lib/learn/learn-path';
import { learnIssueOfMasked } from '@/lib/learn/masked-rows';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { issueRowOfLearn } from '@/lib/workspace/issue-row';
import { maskKeyOf } from '@/lib/workspace/masked-answer';
import { GETTING_IN_PATHS, PICK_ISSUE_PATHS, pullRequestByAttemptPath } from '@/lib/workspace/paths';

/** A Learn row's Start a lesson leads to the Start page in lesson mode; no agent is offered. */
const NO_AGENTS = { hosted: false, own: false };

/** A row's key: its mask id when its details are hidden. */
const issueKey = ({ issueId, masked }: LearnIssue) => (masked?.id ? maskKeyOf(masked.id) : issueId);

/**
 * The card's issues: a masked one is its masked row, which a skip's next issue takes the place of and which leaves
 * with its item; the foot under them says why its details are hidden.
 */
function PracticeIssueRows({ items, room }: { items: LearnIssue[]; room: boolean }) {
  const { rows, swap, drop } = useStableRows(items, issueKey);
  // The foot stays once the last row left, so the line on why it left is still read.
  return (
    <MaskedList from="learn" pageFrom="learn" foot={items.some((issue) => issue.masked)}>
      <ul
        className="divide-y overflow-hidden rounded-xl border empty:hidden"
        {...contributeSource('learn_practice_passed_issue')}
      >
        {rows.map((issue) => {
          const key = issueKey(issue);
          return (
            <li key={key}>
              {issue.masked ? (
                <MaskedListRow
                  issue={issue.masked}
                  onReplace={(next) => swap(key, learnIssueOfMasked(next))}
                  onLeave={() => drop(key)}
                />
              ) : (
                <IssueRow
                  issue={issueRowOfLearn(issue)}
                  side="learn"
                  agents={NO_AGENTS}
                  primary={issue === rows.find((each) => !each.masked)}
                  control={!room}
                />
              )}
            </li>
          );
        })}
      </ul>
    </MaskedList>
  );
}

const CARD = 'flex flex-col gap-3 rounded-xl border-2 border-primary bg-card p-5';
const BUTTON = 'min-h-11 self-start px-5 font-semibold max-sm:w-full';

/** The issues' own links: all of them on the Learn tab (none for a goal Learn can't find issues for), or more practice. */
function MoreLinks({ issues = true }: { issues?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {issues ? (
        <Link
          href={PICK_ISSUE_PATHS.learn}
          prefetch={false}
          className="text-sm font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
        >
          All issues for your goal →
        </Link>
      ) : null}
      <Link
        href={LEARN_PRACTICE_PATH}
        prefetch={false}
        className="text-sm font-semibold text-muted-foreground hover:text-foreground max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        Or another practice lesson
      </Link>
    </div>
  );
}

/**
 * The card a passed practice lesson ends with, decided like the Learn tab: back to the viewer's own lesson in progress,
 * their goal first when none is saved, else "Now your own lesson" with the first two issues for their goal. `next` is
 * read once the card shows (a practice pass reveals no issue before); the catalogue draws it from fixtures.
 */
export function PracticeNextCard({ next: given }: { next?: PracticeNext | null }) {
  const [next, setNext] = useState<PracticeNext | null | undefined>(given);
  useEffect(() => {
    if (given !== undefined) return;
    let live = true;
    readPracticeNext()
      .then((result) => {
        if (live) setNext(result.ok ? result.data : null);
      })
      .catch(() => {
        if (live) setNext(null);
      });
    return () => {
      live = false;
    };
  }, [given]);

  // Still reading: nothing yet, so the card doesn't change under the reader.
  if (next === undefined) return null;

  if (next?.current) {
    return (
      <section aria-labelledby="practice-next" className={CARD} data-next-step="back">
        <h2 id="practice-next" className={HEADING.card}>
          Back to your lesson
        </h2>
        <p className="text-sm text-muted-foreground">
          Your own lesson on “{attemptTitleOf(next.current)}” is in progress. Practice lessons don’t touch it.
        </p>
        <Button asChild className={BUTTON}>
          <Link href={pullRequestByAttemptPath(next.current.attemptId)} prefetch={false}>
            Back to your lesson
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  if (next?.issues && !next.issues.goal) {
    return (
      <section aria-labelledby="practice-next" className={CARD} data-next-step="goal">
        <h2 id="practice-next" className={HEADING.card}>
          Now your own lesson
        </h2>
        <p className="text-sm text-muted-foreground">
          Yours is written for an issue you pick, by your agent, for what you want to learn.
        </p>
        <Button asChild className={BUTTON}>
          <Link href={GETTING_IN_PATHS.learnGoal} prefetch={false}>
            Tell us what you want to learn
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  const issues = next?.issues ?? null;
  const items = issues?.items.slice(0, 2) ?? [];
  const goal = goalValueOf(issues?.goal);
  const room = issues?.room ?? null;
  return (
    <section aria-labelledby="practice-next" className={CARD} data-next-step="own">
      <h2 id="practice-next" className={HEADING.card}>
        Now your own lesson
      </h2>
      <p className="text-sm text-muted-foreground">
        That lesson was written for someone else’s fix. Yours is written for the issue you pick, by your agent, for your
        goal.{items.length ? ` ${items.length === 1 ? 'An issue' : 'Two issues'}${goal ? ` for ${goal}` : ''}:` : ''}
      </p>
      {room && items.length ? <LearnRoomNote room={room} /> : null}
      {items.length ? (
        <PracticeIssueRows items={items} room={!!room} />
      ) : issues ? (
        // None to start: why, as the Learn tab words it.
        <LearnIssuesEmpty issues={issues} goal={goal} />
      ) : null}
      <MoreLinks issues={issues?.empty !== 'GOAL_UNSUPPORTED'} />
    </section>
  );
}
