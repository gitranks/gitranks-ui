import type { ContributeAgentRun, ContributeAgentRunPhase } from './contribute.types';

/**
 * The steps an agent run walks, one list per kind of run and one name per step: the row's status, the hover card's line
 * and the screen reader's text all say the same name. Which step a run is on comes from its phase alone.
 */

/** The three kinds of run: a first run on either side, and a follow-up on a pull request. */
export type RunKind = 'fix' | 'learn' | 'follow-up';

export const RUN_STEPS: Record<RunKind, readonly string[]> = {
  fix: ['Queued', 'Checking the issue', 'Working', 'Checks', 'Ready for your review'],
  learn: ['Taking the issue', 'Fixing the issue', 'Writing your lesson', 'Checks', 'Lesson ready'],
  'follow-up': ['Queued', 'Addressing review', 'Checks', 'Ready for your review', 'Pushing'],
};

/**
 * Each phase's place in each kind's list (0-based); the list's length is "all steps done". A phase a kind never reads
 * (a Learn claim is never queued; a first run never addresses a review) is left out and reads as the first step.
 * `STOPPED` is not placed: a stopped run draws no steps.
 */
const AT: Record<RunKind, Partial<Record<ContributeAgentRunPhase, number>>> = {
  fix: {
    QUEUED: 0,
    CHECKING_ISSUE: 1,
    WORKING: 2,
    RUNNING_CHECKS: 3,
    READY: 4,
    WAITING_FOR_YOU: 4,
    SUBMITTING: 5,
    DONE: 5,
  },
  // The fix's own check runs inside the hand-back: the fourth step is the lesson's checks and review.
  learn: {
    CHECKING_ISSUE: 0,
    WORKING: 1,
    WRITING_LESSON: 2,
    RUNNING_CHECKS: 3,
    READY: 4,
    WAITING_FOR_YOU: 4,
    SUBMITTING: 5,
    DONE: 5,
  },
  'follow-up': {
    QUEUED: 0,
    ADDRESSING_REVIEW: 1,
    RUNNING_CHECKS: 2,
    READY: 3,
    WAITING_FOR_YOU: 3,
    SUBMITTING: 4,
    DONE: 5,
  },
};

/** A run's kind: a follow-up by its kind, a Learn run by its side (or its lesson phase, from an API without the side). */
export function runKindOf(run: Pick<ContributeAgentRun, 'kind' | 'phase' | 'mode'>): RunKind {
  if (run.kind === 'FOLLOW_UP') return 'follow-up';
  return run.mode === 'LEARN' || run.phase === 'WRITING_LESSON' ? 'learn' : 'fix';
}

/** The steps a run walks, and the one it is on (0-based; the list's length once all are done). */
export function stepsOf(run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode'>): {
  steps: readonly string[];
  at: number;
} {
  const kind = runKindOf(run);
  return { steps: RUN_STEPS[kind], at: AT[kind][run.phase] ?? 0 };
}

/** The name of the step a run is on; null once all are done. */
export function stepNameOf(run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode'>): string | null {
  const { steps, at } = stepsOf(run);
  return at < steps.length ? steps[at] : null;
}

/** Each step with where the run stands on it: done, now, or left. */
export function stepMarksOf(
  run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode'>,
): { name: string; mark: 'done' | 'now' | 'left' }[] {
  const { steps, at } = stepsOf(run);
  return steps.map((name, index) => ({ name, mark: index < at ? 'done' : index === at ? 'now' : 'left' }));
}

/** What a screen reader hears of the bars: "Step 3 of 5: Working", or "All steps done". */
export function stepsLabelOf(run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode'>): string {
  const { steps, at } = stepsOf(run);
  return at >= steps.length ? 'All steps done' : `Step ${at + 1} of ${steps.length}: ${steps[at]}`;
}
