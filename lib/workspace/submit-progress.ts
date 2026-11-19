import { SUBMIT_STEPS } from './attempt-format';
import type { ContributeAttemptState, ContributeAttemptSubmit, ContributeSubmitStep } from './contribute.types';

/**
 * A step of the submission as the stepper draws it: `done` (with how long it took), `current` (running, with when it
 * started), `retrying` (failed for a passing reason, sent again at `retryAt`), `failed` (the submission stopped or went
 * back to the review there), `skipped` (the sync, when the user's own repo stands for the fork), `pending`.
 */
export type SubmitStepState = 'done' | 'current' | 'retrying' | 'failed' | 'skipped' | 'pending';

export type SubmitStepView = {
  step: ContributeSubmitStep;
  label: string;
  state: SubmitStepState;
  startedAt: string | null;
  durationMs: number | null;
};

export type SubmitProgress = {
  steps: SubmitStepView[];
  /** The step running, retrying or failed; null while waiting or once every step is done. */
  current: SubmitStepView | null;
  /** Every step done (or skipped): the pull request is open. */
  finished: boolean;
  /** From the first step's start to the last one's end, once finished and the clock is known. */
  totalMs: number | null;
};

/** The states an attempt is in once its pull request opened. */
const OPENED: ContributeAttemptState[] = ['PR_OPEN', 'FOLLOW_UP', 'MERGED', 'CLOSED'];

/** The states a submission stands in after it stopped or went back to the review on a failure. */
const FAILED_IN: ContributeAttemptState[] = ['REVIEW', 'STOPPED'];

const ms = (iso: string | null | undefined) => {
  const at = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(at) ? null : at;
};

/**
 * Where each of the four steps stands, from the attempt's state and its submission. Without the steps' clock (an API
 * that does not answer it yet) the steps before the current one read as done, with no duration.
 */
export function submitProgressOf(state: ContributeAttemptState, submit: ContributeAttemptSubmit): SubmitProgress {
  const times = new Map((submit.steps ?? []).map((time) => [time.step, time]));
  const opened = OPENED.includes(state);
  const submitting = state === 'SUBMITTING';
  const failedHere = FAILED_IN.includes(state) && !!submit.lastError;
  // Queued, the fork is next: it reads as starting. A bounce before the fork (a busy repo, say) failed no step.
  const currentIndex =
    submit.step === 'QUEUED' ? (submitting ? 0 : -1) : SUBMIT_STEPS.findIndex(({ step }) => step === submit.step);

  const steps = SUBMIT_STEPS.map(({ step, label }, index): SubmitStepView => {
    const time = times.get(step);
    const startedAt = time?.startedAt ?? null;
    const doneMs = ms(time?.doneAt);
    const startMs = ms(startedAt);
    // A step that started and finished at the same instant was not timed (it ran across a change of the API): unknown.
    const durationMs = doneMs !== null && startMs !== null && doneMs > startMs ? doneMs - startMs : null;
    const view = (stepState: SubmitStepState, at = startedAt): SubmitStepView => ({
      step,
      label,
      state: stepState,
      startedAt: at,
      durationMs: stepState === 'done' ? durationMs : null,
    });

    if (opened) return view(times.size && !time ? 'skipped' : 'done');
    if (doneMs !== null) return view('done');
    if (index === currentIndex) {
      if (submitting) return view(submit.retryAt ? 'retrying' : 'current', startedAt ?? submit.stepStartedAt ?? null);
      if (failedHere) return view('failed');
      return view('pending');
    }
    if (index < currentIndex) return view(times.size && !time ? 'skipped' : 'done');
    return view('pending');
  });

  const finished = steps.every(({ state: stepState }) => stepState === 'done' || stepState === 'skipped');
  const current = steps.find(({ state: stepState }) => ['current', 'retrying', 'failed'].includes(stepState)) ?? null;
  const first = ms(submit.steps?.[0]?.startedAt);
  const last = ms(submit.steps?.at(-1)?.doneAt);
  const totalMs = finished && first !== null && last !== null ? Math.max(0, last - first) : null;
  return { steps, current, finished, totalMs };
}

/** How long a step took or has run: `2.7 s` under ten seconds, then `42 s`, `3 min 5 s`, `1 h 4 min`. */
export function durationLabel(durationMs: number, { tenths = true }: { tenths?: boolean } = {}): string {
  const safe = Math.max(0, durationMs);
  if (safe < 10_000 && tenths) return `${(Math.floor(safe / 100) / 10).toFixed(1)} s`;
  const seconds = Math.floor(safe / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
  return minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${Math.floor(minutes / 60)} h`;
}

/** A step that runs longer than this (GitHub making a new fork, say) is read again less often. */
export const SUBMIT_SLOW_STEP_MS = 60_000;
export const SUBMIT_POLL_MS = 2_000;
export const SUBMIT_SLOW_POLL_MS = 5_000;
const SUBMIT_RETRY_POLL_MAX_MS = 15_000;

/**
 * When the stepper reads the submission again: soon while a step runs, less often once it has run a minute, near its
 * time while a step waits to be tried again; never while it waits for the next day (the page's own reads cover that).
 */
export function submitPollDelayOf(
  state: ContributeAttemptState,
  submit: ContributeAttemptSubmit,
  nowMs: number,
): number | null {
  if (state !== 'SUBMITTING' || submit.step === 'WAITING_CAP') return null;
  const retryAt = ms(submit.retryAt);
  if (retryAt !== null) return Math.min(SUBMIT_RETRY_POLL_MAX_MS, Math.max(SUBMIT_POLL_MS, retryAt - nowMs));
  const startedAt = ms(submit.stepStartedAt);
  return startedAt !== null && nowMs - startedAt > SUBMIT_SLOW_STEP_MS ? SUBMIT_SLOW_POLL_MS : SUBMIT_POLL_MS;
}
