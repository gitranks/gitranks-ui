import type { ContributeAgentRun, ContributeAgentRunPhase } from './contribute.types';

/**
 * The steps an agent run walks, one list per kind of run and one name per step: the row's status and the screen
 * reader's text say the same name. Which step a run is on comes from its phase alone.
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

/** Whether a run is Learn's: by its side, or by its lesson phase from an API that does not say the side. */
export const isLearnRun = (run: Pick<ContributeAgentRun, 'mode' | 'phase'>) =>
  run.mode === 'LEARN' || run.phase === 'WRITING_LESSON';

/** A run's kind: a follow-up by its kind, else a first run of its side. */
export function runKindOf(run: Pick<ContributeAgentRun, 'kind' | 'phase' | 'mode'>): RunKind {
  if (run.kind === 'FOLLOW_UP') return 'follow-up';
  return isLearnRun(run) ? 'learn' : 'fix';
}

/**
 * The phases an agent works in, which a step names. Not: queued (waiting), the autopilot's hour, submitting (no agent
 * works), settled.
 */
export const WORKING_PHASES: readonly ContributeAgentRunPhase[] = [
  'CHECKING_ISSUE',
  'WORKING',
  'WRITING_LESSON',
  'ADDRESSING_REVIEW',
  'RUNNING_CHECKS',
];

/** Whether an agent works on the run now, by its phase: its status is then the name of its step. */
export const isWorkingPhase = (run: Pick<ContributeAgentRun, 'phase'>) => WORKING_PHASES.includes(run.phase);

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

/** What a screen reader hears of the bars: "Step 3 of 5: Working", or "All steps done". */
export function stepsLabelOf(run: Pick<ContributeAgentRun, 'phase' | 'kind' | 'mode'>): string {
  const { steps, at } = stepsOf(run);
  return at >= steps.length ? 'All steps done' : `Step ${at + 1} of ${steps.length}: ${steps[at]}`;
}
