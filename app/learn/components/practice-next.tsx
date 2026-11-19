'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readPracticeNext } from '../actions';
import { LearnIssueRow, RoomNote } from './learn-issues';
import { HEADING } from '@/app/contribute/components/primitives';
import { Button } from '@/components/ui/button';
import type { PracticeNext } from '@/lib/learn/learn.types';
import { attemptTitleOf, goalValueOf } from '@/lib/learn/learn-home';
import { LEARN_PATH, LEARN_PRACTICE_PATH, learnAttemptPath } from '@/lib/learn/learn-path';
import { LEARN_ISSUES_PATH } from '@/lib/learn/learn-start';

const CARD = 'flex flex-col gap-3 rounded-xl border-2 border-primary bg-card p-5';
const BUTTON = 'min-h-11 self-start px-5 font-semibold max-sm:w-full';

/** The issues' own links: all of them on Learn home, or another practice lesson. */
function MoreLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Link
        href={LEARN_ISSUES_PATH}
        prefetch={false}
        className="text-sm font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        All issues for your goal →
      </Link>
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
 * The card a passed practice lesson ends with, decided like Learn home: back to the viewer's own lesson in progress,
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
          <Link href={learnAttemptPath(next.current.attemptId)} prefetch={false}>
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
          <Link href={LEARN_PATH} prefetch={false}>
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
      {room && items.length ? <RoomNote room={room} /> : null}
      {items.length ? (
        <ul className="divide-y overflow-hidden rounded-xl border">
          {items.map((issue, index) => (
            <LearnIssueRow
              key={issue.issueId}
              issue={issue}
              source="learn_practice_passed_issue"
              start={room ? null : { label: index === 0 ? 'Start with my agent' : 'Start', primary: index === 0 }}
            />
          ))}
        </ul>
      ) : null}
      <MoreLinks />
    </section>
  );
}
