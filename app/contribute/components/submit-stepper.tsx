'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useReducer, useRef, useState } from 'react';

import { readAttemptLive } from '../actions';
import { StatusLine } from './status-line';
import { githubUrlOf, labelOf, SUBMIT_STEP_TEXT, timeLabel } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttempt,
  ContributeAttemptLive,
  ContributeAttemptPullRequest,
  ContributeAttemptSubmit,
  ContributeSubmitStep,
} from '@/lib/contribute/contribute.types';
import { relativeLabel } from '@/lib/contribute/format';
import { settledStepsOf } from '@/lib/contribute/session-status';
import {
  durationLabel,
  type SubmitProgress,
  submitPollDelayOf,
  submitProgressOf,
} from '@/lib/contribute/submit-progress';

/** Steps that finished between two reads light up one after another, this far apart. */
const STAGGER_MS = 380;
/** After the last step lights up, the page is read again (the PR card) this much later. */
const SETTLE_MS = 900;
/** Failed reads in a row tried again before the stepper leaves it to the page's own reads. */
const READ_TRIES = 5;

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

type Delays = Partial<Record<ContributeSubmitStep, number>>;

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
  const [{ live }, dispatch] = useReducer(liveReducer, { live: attempt, delays: {} });
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
  const title = progress?.finished
    ? 'Your pull request is open'
    : live.state === 'REVIEW'
      ? 'Back for your approval'
      : live.state === 'STOPPED'
        ? 'Stopped'
        : waiting
          ? "Waiting for tomorrow's pull request slot"
          : 'Opening your pull request';
  const times = progress?.steps.flatMap((view) =>
    view.state === 'done' && view.durationMs !== null ? [`${view.label}: ${durationLabel(view.durationMs)}`] : [],
  );
  return (
    <StatusLine
      name={waiting ? 'WAITING_CAP' : live.state}
      lead={
        waiting ? { kind: 'pill', label: 'Submitting', tone: 'violet' } : running ? { kind: 'dot' } : { kind: 'check' }
      }
      title={title}
      bar={
        progress && !waiting
          ? progress.steps.map((view) => ({ id: view.step, label: view.label, state: view.state }))
          : null
      }
      live={running}
      details={
        live.submit && progress ? (
          <>
            <p data-submit-now={live.submit.step}>
              <NowLine progress={progress} submit={live.submit} pullRequest={live.pullRequest} nowMs={clock} />
            </p>
            {times?.length ? <p className="font-mono text-xs">{times.join(' · ')}</p> : null}
          </>
        ) : (
          <p>Approved. The steps are not available yet.</p>
        )
      }
    />
  );
}

/** The steps as they ended, for a pull request just opened or a submission that failed: one line, no reads. */
export function SubmitStepsSettled({ submit }: { submit: ContributeAttemptSubmit }) {
  return <span className="font-mono text-xs">{settledStepsOf(submit)}</span>;
}
