import type { Route } from 'next';

import type { LearnProfile, MyLearnAttempt, MyLearnAttempts } from './learn.types';
import { currentOf, hasGoal } from './learn-home';
import { PROGRESS_TABS, PROGRESS_VIEWS, progressPath } from './progress/progress';
import type { LearnProgressCounts } from './progress/progress.types';
import { pullRequestByAttemptPath } from '@/lib/workspace/paths';

/**
 * The Learn tab (`/learn`, signed in, Learn open): which state it is in, the path to a first pull request with its
 * marks and step 3's link, and the four numbers that take the path's place after the first Learn pull request.
 */

/** What the Learn tab shows under its head, decided in this order. */
export type LearnTabState =
  /** GitRanks holds the account: no issues, no Start; practice lessons stay. */
  | { kind: 'held' }
  /** A new account GitRanks is still setting up. */
  | { kind: 'setting-up' }
  /** No Learn goal saved yet: the goal question. */
  | { kind: 'no-goal' }
  /** The viewer's own agent works on their lesson's fix (or rewrites it): Right now, practice while they wait. */
  | { kind: 'working'; current: MyLearnAttempt }
  /** The viewer's lesson waits for them (to take, fix, submit) or its pull request is being opened. */
  | { kind: 'lesson'; current: MyLearnAttempt }
  /** A goal, and no lesson of their own in progress: the issues for it, then practice. */
  | { kind: 'ready' };

/** Whether the agent works on the attempt: its fix, or its lesson sent back. */
const isWorking = (attempt: Pick<MyLearnAttempt, 'stage'>) =>
  attempt.stage === 'AGENT_WORKING' || attempt.stage === 'AGENT_REWRITING';

export function learnTabStateOf({
  held,
  settingUp,
  profile,
  attempts,
}: {
  held: boolean;
  settingUp: boolean;
  profile: LearnProfile | null | undefined;
  attempts: MyLearnAttempts | null | undefined;
}): LearnTabState {
  if (held) return { kind: 'held' };
  if (settingUp) return { kind: 'setting-up' };
  if (!hasGoal(profile)) return { kind: 'no-goal' };
  const current = currentOf(attempts);
  if (current) return isWorking(current) ? { kind: 'working', current } : { kind: 'lesson', current };
  return { kind: 'ready' };
}

/** One step of the path to a first pull request. */
export type PathStep = { key: 'goal' | 'agent' | 'pass'; where: string; title: string };

export const LEARN_PATH_STEPS: readonly PathStep[] = [
  { key: 'goal', where: '1 · Here, one minute', title: 'Tell us what you want to learn' },
  { key: 'agent', where: '2 · Your terminal', title: 'Your agent fixes an issue and writes your lesson' },
  { key: 'pass', where: '3 · Here', title: 'Pass your lesson, open the pull request' },
];

/** Where a step of the path is: done, the one now, the agent working on it, or still to come. */
export type PathMark = 'done' | 'now' | 'working' | 'next';

/** Each step's mark: by whether a goal is saved, then by the viewer's own lesson in progress. */
export function pathMarksOf({
  goal,
  current,
}: {
  goal: boolean;
  current: MyLearnAttempt | null;
}): [PathMark, PathMark, PathMark] {
  if (!goal) return ['now', 'next', 'next'];
  if (!current) return ['done', 'now', 'next'];
  return isWorking(current) ? ['done', 'working', 'next'] : ['done', 'done', 'now'];
}

/**
 * Step 3 while the viewer's lesson waits for them: the page's primary button to the lesson (to take it, fix its
 * questions, or submit the pull request), or a line while the pull request is being opened. Null before then.
 */
export type StepThree = { kind: 'link'; label: string; href: Route } | { kind: 'status'; text: string };

export function stepThreeOf(current: MyLearnAttempt | null): StepThree | null {
  if (!current || isWorking(current)) return null;
  const href = pullRequestByAttemptPath(current.attemptId, { view: 'lesson' });
  switch (current.stage) {
    case 'WARMUP':
    case 'LESSON':
      return { kind: 'link', label: 'Take your lesson', href };
    case 'BLOCKED':
      return { kind: 'link', label: 'Open your lesson', href };
    default:
      return current.state === 'SUBMITTING' || current.state === 'PENDING_AUTOSUBMIT'
        ? { kind: 'status', text: 'Opening your pull request…' }
        : { kind: 'link', label: 'Submit your pull request', href };
  }
}

/** The path's steps, step 3's line naming the lesson's length once it is known: "3 · Here, 10 minutes". */
export function pathStepsOf(current: Pick<MyLearnAttempt, 'lessonMinutes'> | null): PathStep[] {
  const minutes = current?.lessonMinutes;
  return LEARN_PATH_STEPS.map((step) =>
    step.key === 'pass' && typeof minutes === 'number' && minutes > 0
      ? { ...step, where: `3 · Here, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}` }
      : step,
  );
}

/**
 * What takes the place under the head: the path before the first Learn pull request, the four numbers after it.
 * Without the numbers, the path while a lesson of the viewer's is in progress or their attempts were not read either,
 * and nothing otherwise.
 */
export function headPartOf({
  counts,
  attempts,
}: {
  counts: LearnProgressCounts | undefined;
  attempts: MyLearnAttempts | undefined;
}): 'path' | 'tiles' | 'none' {
  if (counts) return counts.prsOpened > 0 ? 'tiles' : 'path';
  return attempts === undefined || currentOf(attempts) ? 'path' : 'none';
}

/** The four numbers, in Your progress's order and words, each a link to its view there. */
export const learnTilesOf = (counts: LearnProgressCounts): { label: string; value: string; href: Route }[] =>
  PROGRESS_VIEWS.map((view) => ({
    label: PROGRESS_TABS[view].label.toLowerCase(),
    value: counts[PROGRESS_TABS[view].count].toLocaleString('en-US'),
    href: progressPath({ view }),
  }));

/** Below the lists while the viewer's own lesson is in progress: a page rule, not a refusal. */
export const ONE_AT_A_TIME = 'One lesson of your own at a time. More issues show here once this one is done.';

/** The issues: the first 10, then 10 more a time, up to the most the API answers. */
export const LEARN_ISSUES_FIRST = 10;
export const LEARN_ISSUES_MAX = 100;

/** Practice lessons: the first 3, then 10 more a time, up to the most the API answers. */
export const PRACTICE_FIRST = 3;
export const PRACTICE_MAX = 93;

/** How many a list shows after one more "Show 10 more": 10 more, never past its most. */
export const grownTo = (shown: number, max: number, step = 10) => Math.min(shown + step, max);
