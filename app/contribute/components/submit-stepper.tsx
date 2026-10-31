'use client';

import { Check, Minus, RotateCw, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type CSSProperties, type ReactNode, useEffect, useReducer, useRef, useState } from 'react';

import { readAttemptLive } from '../actions';
import { HEADING } from './primitives';
import { Button } from '@/components/ui/button';
import { githubUrlOf, labelOf, SUBMIT_STEP_TEXT, timeLabel } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttempt,
  ContributeAttemptLive,
  ContributeAttemptPullRequest,
  ContributeAttemptState,
  ContributeAttemptSubmit,
  ContributeSubmitStep,
} from '@/lib/contribute/contribute.types';
import { relativeLabel } from '@/lib/contribute/format';
import {
  durationLabel,
  type SubmitProgress,
  type SubmitStepView,
  submitPollDelayOf,
  submitProgressOf,
} from '@/lib/contribute/submit-progress';
import { cn } from '@/lib/utils';

/** Steps that finished between two reads light up one after another, this far apart. */
const STAGGER_MS = 380;
/** After the last step lights up, the page is read again (the PR card) this much later. */
const SETTLE_MS = 900;
/** Failed reads in a row tried again before the stepper leaves it to the page's own reads. */
const READ_TRIES = 5;

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

type Delays = Partial<Record<ContributeSubmitStep, number>>;

/** A step's dot: a check once done, a spinning ring while it runs, a cross where it failed. */
function StepDot({ view, index, changed }: { view: SubmitStepView; index: number; changed: boolean }) {
  const base = 'relative flex size-8 flex-none items-center justify-center rounded-full text-sm font-semibold';
  switch (view.state) {
    case 'done':
      return (
        <span
          className={cn(
            base,
            'bg-positive text-background',
            changed && 'motion-safe:animate-contribute-pop motion-safe:[animation-delay:var(--step-delay)]',
          )}
        >
          <Check className="size-4" strokeWidth={3} aria-hidden="true" />
        </span>
      );
    case 'current':
    case 'retrying': {
      const warn = view.state === 'retrying';
      return (
        <span
          className={cn(
            base,
            'border-2 bg-background',
            warn ? 'border-warning text-warning' : 'border-primary text-primary',
            changed &&
              'motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:[animation-delay:var(--step-delay)]',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 rounded-full opacity-0 motion-safe:animate-contribute-pulse',
              warn ? 'bg-warning/30' : 'bg-primary/30',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'absolute -inset-1 rounded-full border-2 border-transparent motion-safe:animate-spin motion-reduce:hidden',
              warn ? 'border-t-warning' : 'border-t-primary',
            )}
          />
          {warn ? <RotateCw className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true">{index + 1}</span>}
        </span>
      );
    }
    case 'failed':
      return (
        <span className={cn(base, 'bg-destructive text-destructive-foreground')}>
          <X className="size-4" strokeWidth={3} aria-hidden="true" />
        </span>
      );
    case 'skipped':
      return (
        <span className={cn(base, 'border border-dashed text-muted-foreground')}>
          <Minus className="size-4" aria-hidden="true" />
        </span>
      );
    default:
      return (
        <span className={cn(base, 'border bg-background text-muted-foreground')} aria-hidden="true">
          {index + 1}
        </span>
      );
  }
}

/** Under a step's name: how long it took, how long it has run, when it is tried again. */
function stepMetaOf(view: SubmitStepView, nowMs: number | null, retryAt: string | null | undefined): string {
  switch (view.state) {
    case 'done':
      return view.durationMs === null ? 'Done' : durationLabel(view.durationMs);
    case 'current': {
      const started = view.startedAt ? Date.parse(view.startedAt) : Number.NaN;
      if (nowMs === null || Number.isNaN(started)) return 'Now';
      return durationLabel(nowMs - started, { tenths: false });
    }
    case 'retrying': {
      const at = retryAt ? Date.parse(retryAt) : Number.NaN;
      if (nowMs === null || Number.isNaN(at) || at <= nowMs) return 'Trying again';
      return `Again in ${durationLabel(at - nowMs, { tenths: false })}`;
    }
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Not needed';
    default:
      return '';
  }
}

const STEP_STATE_WORDS: Record<SubmitStepView['state'], string> = {
  done: 'done',
  current: 'in progress',
  retrying: 'trying again',
  failed: 'failed',
  skipped: 'not needed',
  pending: 'not started',
};

/**
 * Fork, sync, push, pull request: each step's dot, joined by lines that fill as steps finish. The running step spins
 * and counts up; a finished one shows how long it took; the last one links to the pull request once it is open. A step
 * that changed since the last read (in `delays`) pops or fades in at its turn; on a first render nothing replays. Every
 * motion is under `motion-safe`.
 */
export function SubmitStepper({
  progress,
  submit,
  pullRequest,
  nowMs = null,
  delays = {},
}: {
  progress: SubmitProgress;
  submit: ContributeAttemptSubmit;
  pullRequest?: ContributeAttemptPullRequest | null;
  nowMs?: number | null;
  delays?: Delays;
}) {
  const prUrl = githubUrlOf(pullRequest?.url);
  return (
    <ol aria-label="Submission steps" className="grid grid-cols-4 pt-1">
      {progress.steps.map((view, index) => {
        const filled = view.state === 'done' || view.state === 'skipped';
        const meta = stepMetaOf(view, nowMs, submit.retryAt);
        const last = index === progress.steps.length - 1;
        return (
          <li
            key={view.step}
            data-step={view.step}
            data-step-state={view.state}
            aria-current={view.state === 'current' || view.state === 'retrying' ? 'step' : undefined}
            style={{ '--step-delay': `${delays[view.step] ?? 0}ms` } as CSSProperties}
            className="relative flex min-w-0 flex-col items-center gap-1.5 px-0.5 text-center"
          >
            {last ? null : (
              <span
                aria-hidden="true"
                className="absolute top-4 right-[calc(-50%+1.25rem)] left-[calc(50%+1.25rem)] h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-border"
              >
                <span
                  data-step-line={filled ? 'filled' : 'empty'}
                  className={cn(
                    'block h-full origin-left bg-positive motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:[transition-delay:var(--step-delay)]',
                    filled ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </span>
            )}
            <StepDot key={view.state} view={view} index={index} changed={view.step in delays} />
            <span
              className={cn(
                'text-sm leading-tight',
                view.state === 'pending' || view.state === 'skipped' ? 'text-muted-foreground' : 'font-medium',
                view.state === 'failed' && 'text-destructive',
              )}
            >
              {last && prUrl && view.state === 'done' ? (
                <a href={prUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
                  {view.label}
                  <span className="hidden sm:inline"> #{pullRequest?.number}</span> ↗
                </a>
              ) : (
                view.label
              )}
              <span className="sr-only">: {STEP_STATE_WORDS[view.state]}</span>
            </span>
            <span className="min-h-4 text-xs text-muted-foreground tabular-nums">{meta}</span>
          </li>
        );
      })}
    </ol>
  );
}

const Title = ({ children }: { children: ReactNode }) => <h2 className={HEADING.card}>{children}</h2>;

/** What is happening now, in a sentence; once the pull request is open, its link. */
function NowLine({
  progress,
  submit,
  pullRequest,
  nowMs,
}: {
  progress: SubmitProgress;
  submit: ContributeAttemptSubmit;
  pullRequest: ContributeAttemptPullRequest | null | undefined;
  nowMs: number | null;
}) {
  if (progress.finished) {
    const url = githubUrlOf(pullRequest?.url);
    return (
      <>
        {pullRequest ? (
          url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link hover:underline">
              Pull request #{pullRequest.number} is open on GitHub ↗
            </a>
          ) : (
            <span className="font-semibold">Pull request #{pullRequest.number} is open.</span>
          )
        ) : (
          'The pull request is open.'
        )}
        {progress.totalMs !== null ? ` Submitted in ${durationLabel(progress.totalMs)}.` : ''}
      </>
    );
  }
  const step = submit.step;
  const note = submit.lastError?.note;
  let words = labelOf(SUBMIT_STEP_TEXT, step);
  if (progress.current?.state === 'failed') {
    words = note || 'The last step did not go through.';
  } else if (step === 'WAITING_CAP') {
    // Relative to the clock once it runs (the client's), so the server's and the browser's first render agree.
    const when = nowMs === null ? '' : ` ${relativeLabel(submit.waitUntil, new Date(nowMs))},`;
    words += submit.waitUntil
      ? ` It goes on${when} at ${timeLabel(submit.waitUntil)}. Nothing to do: it starts by itself.`
      : ' It goes on when the next UTC day starts. Nothing to do: it starts by itself.';
  } else if (progress.current?.state === 'retrying') {
    // No countdown here: this line is a live region, and the step's own label counts down.
    words = note || 'The last try did not go through. Trying again shortly.';
  } else if (step === 'FORK' && submit.forkPending) {
    words = 'GitHub is making your fork. A new fork can take a few minutes.';
  } else if (note) {
    words += ` ${note}`;
  }
  return (
    <>
      {words}
      {submit.fork ? ` From ${submit.fork}${submit.branch ? `, branch ${submit.branch}` : ''}.` : ''}
    </>
  );
}

type Live = Pick<ContributeAttemptLive, 'state' | 'submit' | 'pullRequest' | 'updatedAt'>;
type LiveState = { live: Live; delays: Delays };

/** The steps that changed between two reads get delays in their order, so a jump of several steps plays out in turn. */
function delaysOf(before: Live, after: Live, stagger: number): Delays {
  if (!before.submit || !after.submit) return {};
  const was = submitProgressOf(before.state, before.submit).steps;
  const delays: Delays = {};
  let turn = 0;
  for (const view of submitProgressOf(after.state, after.submit).steps) {
    const previous = was.find(({ step }) => step === view.step);
    if (previous?.state === view.state) continue;
    delays[view.step] = turn * stagger;
    if (view.state === 'done' || view.state === 'skipped') turn += 1;
  }
  return delays;
}

function liveReducer(state: LiveState, next: { live: Live; stagger: number }): LiveState {
  if (next.live.updatedAt < state.live.updatedAt) return state;
  return { live: next.live, delays: delaysOf(state.live, next.live, next.stagger) };
}

/**
 * The submission while it runs, read again every two seconds or so (less often once a step has run a minute, never
 * while the tab is hidden): the stepper moves as each step finishes, the running one counts up. When the attempt
 * leaves `submitting` (the pull request opened, or it went back to the review), the last steps play out and the page is
 * read again for the PR card, without a reload.
 */
export function LiveSubmit({
  attempt,
  now,
}: {
  attempt: Pick<ContributeAttempt, 'attemptId' | 'state' | 'submit' | 'pullRequest' | 'updatedAt'>;
  now?: Date;
}) {
  const router = useRouter();
  const [{ live, delays }, dispatch] = useReducer(liveReducer, { live: attempt, delays: {} });
  // Our clock against the server's (the read's time), so a step's elapsed time does not drift with the device's.
  const offset = useRef(0);
  const [clock, setClock] = useState<number | null>(now ? now.getTime() : null);
  const latest = useRef(live);
  latest.current = live;

  // A newer read of the page (the 30-second read, a refresh): taken.
  useEffect(() => {
    dispatch({ live: attempt, stagger: reducedMotion() ? 0 : STAGGER_MS });
  }, [attempt]);

  const progress = live.submit ? submitProgressOf(live.state, live.submit) : null;
  const running = progress?.current?.state === 'current' || progress?.current?.state === 'retrying';
  // Reads run while it submits a step; a page first read while waiting for the day (or without its submission) starts
  // them once a newer read of the page shows a step.
  const pollable = live.state === 'SUBMITTING' && !!live.submit && live.submit.step !== 'WAITING_CAP';
  // Left `submitting`: the steps that changed play out, then the page is read again (the PR card, the review).
  const [settling, setSettling] = useState<number | null>(null);
  // An API without the steps' clock is asked without it from then on, once per read rather than twice.
  const withClock = useRef(true);

  useEffect(() => {
    if (settling === null) return;
    const timer = setTimeout(() => router.refresh(), reducedMotion() ? 0 : settling * STAGGER_MS + SETTLE_MS);
    return () => clearTimeout(timer);
  }, [settling, router]);

  // The clock starts after the first render, so the server's render and the browser's agree.
  useEffect(() => {
    setClock((at) => at ?? Date.now());
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => setClock(Date.now() + offset.current);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [running]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a newer read of the page (`updatedAt`) starts the reads again, after failures too.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let hiddenWait = false;
    let stopped = false;

    const delayOf = () => {
      const { state, submit } = latest.current;
      return submit ? submitPollDelayOf(state, submit, Date.now() + offset.current) : null;
    };
    const schedule = (delay: number | null) => {
      clearTimeout(timer);
      if (delay !== null) timer = setTimeout(read, delay);
    };
    const read = async () => {
      if (document.visibilityState !== 'visible') {
        hiddenWait = true;
        return;
      }
      const result = await readAttemptLive(attempt.attemptId, withClock.current).catch(() => null);
      if (stopped) return;
      if (!result?.ok || !result.data.attempt) {
        failures += 1;
        if (result?.ok === false && result.error === 'SIGNED_OUT') return;
        if (failures < READ_TRIES) schedule((delayOf() ?? 0) * 2 ** failures);
        return;
      }
      failures = 0;
      withClock.current = result.data.clock;
      const readAt = Date.parse(result.data.readAt);
      if (!Number.isNaN(readAt)) offset.current = readAt - Date.now();
      const next = result.data.attempt;
      const stagger = reducedMotion() ? 0 : STAGGER_MS;
      const changed = delaysOf(latest.current, next, stagger);
      latest.current = next;
      dispatch({ live: next, stagger });
      if (next.state !== 'SUBMITTING') {
        setSettling(Object.keys(changed).length);
        return;
      }
      schedule(delayOf());
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && hiddenWait) {
        hiddenWait = false;
        read();
      }
    };

    if (!pollable) return;
    schedule(delayOf());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt.attemptId, attempt.updatedAt, pollable]);

  const waiting = live.submit?.step === 'WAITING_CAP';
  return (
    <>
      <Title>
        {progress?.finished
          ? 'Your pull request is open'
          : live.state === 'REVIEW'
            ? 'Back for your approval'
            : live.state === 'STOPPED'
              ? 'Stopped'
              : waiting
                ? 'Waiting for tomorrow'
                : 'Submitting your pull request'}
      </Title>
      {live.submit && progress ? (
        <>
          {waiting ? null : (
            <SubmitStepper
              progress={progress}
              submit={live.submit}
              pullRequest={live.pullRequest}
              nowMs={clock}
              delays={delays}
            />
          )}
          <p role="status" className="text-sm text-muted-foreground" data-submit-now={live.submit.step}>
            <NowLine progress={progress} submit={live.submit} pullRequest={live.pullRequest} nowMs={clock} />
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Approved. The steps are not available yet.</p>
      )}
    </>
  );
}

/** The steps as they ended, for a pull request just opened or a submission that failed: no reads, no clock. */
export function SubmitStepsSettled({
  state,
  submit,
  pullRequest,
}: {
  state: ContributeAttemptState;
  submit: ContributeAttemptSubmit;
  pullRequest?: ContributeAttemptPullRequest | null;
}) {
  return <SubmitStepper progress={submitProgressOf(state, submit)} submit={submit} pullRequest={pullRequest} />;
}

/** Back in the review after a step failed: to the pull request form, to approve it again. */
export function TryAgainButton() {
  return (
    <Button
      type="button"
      size="sm"
      className="self-start"
      onClick={() => {
        const form = document.getElementById('pr-form');
        if (!form) return;
        form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
        const target =
          form.querySelector<HTMLElement>('button[type="submit"]:not(:disabled)') ??
          form.querySelector<HTMLElement>('input, textarea');
        target?.focus({ preventScroll: true });
      }}
    >
      Try again
    </Button>
  );
}
