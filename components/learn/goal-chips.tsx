import type { Route } from 'next';
import Link from 'next/link';

import { Pill } from '@/components/pill/pill';
import type { LearnGoalView } from '@/lib/learn/learn.types';
import { goalValueOf } from '@/lib/learn/learn-home';

/**
 * "For your goal: TypeScript · Some · Change": the goal an issue list is for, and the way to change it (`changeHref`:
 * the goal's page in Settings on the Learn tab, Your goal in Learn's flow).
 */
export function GoalChips({ goal, changeHref }: { goal: LearnGoalView; changeHref: Route }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-goal-chips="">
      For your goal:
      <Pill tone="violet">{goalValueOf(goal)}</Pill>
      {goal.level ? <Pill tone="violet">{goal.level}</Pill> : null}
      <Link
        href={changeHref}
        prefetch={false}
        className="font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        Change
      </Link>
    </span>
  );
}
