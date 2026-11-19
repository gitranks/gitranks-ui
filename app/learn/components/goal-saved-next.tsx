import { ArrowRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import type { PracticeNext } from '@/lib/learn/learn.types';
import { attemptTitleOf, currentOf } from '@/lib/learn/learn-home';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { learnAttemptPath, PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

/** The panel's words and its one button. */
type Words = { title: string; text: string; action: { href: Route; label: string } };

/**
 * What the panel under Goal and level says once saved: back to the lesson in progress; else how many open issues fit
 * the goal (`issues` read with `first: 0`, which reveals none), none today, or a goal Learn can't find issues for.
 * `goal` is the saved goal's own words.
 */
export function goalSavedWordsOf(next: PracticeNext | null, goal: string): Words {
  const current = next?.current ? currentOf({ current: next.current, lastPullRequest: null }) : null;
  if (current) {
    return {
      title: 'Your lesson is in progress',
      text: `Your next lesson can start once “${attemptTitleOf(current)}” is done.`,
      action: { href: learnAttemptPath(current.attemptId), label: 'Back to your lesson' },
    };
  }
  const issues = next?.issues ?? null;
  const see = { href: PICK_ISSUE_PATHS.learn, label: `See issues for ${goal}` };
  const title = 'Next: an issue to learn from';
  if (issues?.empty === 'GOAL_UNSUPPORTED') {
    return {
      title,
      text: `Learn can’t find issues for ${goal} yet. Pick a language from the list on Learn home.`,
      action: { href: LEARN_PATH, label: 'Back to Learn home' },
    };
  }
  if (issues && issues.total > 0) {
    return {
      title,
      text: `${issues.total.toLocaleString('en-US')} open ${issues.total === 1 ? 'issue fits' : 'issues fit'} ${goal}. Your agent fixes the one you pick and writes your lesson.`,
      action: see,
    };
  }
  if (issues) return { title, text: `None fit ${goal} today. New ones come in every day.`, action: see };
  return { title, text: 'Learn home lists the open issues for your goal.', action: see };
}

/** Under Goal and level once saved: the next step on the path, worded by `goalSavedWordsOf`. */
export function GoalSavedNext({ next, goal }: { next: PracticeNext | null; goal: string }) {
  const words = goalSavedWordsOf(next, goal);
  return (
    <section
      aria-labelledby="saved-next"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-brand-soft px-5 py-4"
      data-saved-next={next?.current ? 'lesson' : (next?.issues?.empty ?? (next?.issues ? 'issues' : 'unread'))}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="saved-next" className={HEADING.card}>
          {words.title}
        </h2>
        <p className="text-sm text-muted-foreground">{words.text}</p>
      </div>
      <Button asChild className="min-h-11 shrink-0 px-5 font-semibold max-sm:w-full">
        <Link href={words.action.href} prefetch={false}>
          {words.action.label}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}
