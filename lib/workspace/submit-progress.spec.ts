import { describe, expect, it } from 'vitest';

import type { ContributeAttemptSubmit } from './contribute.types';
import {
  durationLabel,
  SUBMIT_POLL_MS,
  SUBMIT_SLOW_POLL_MS,
  submitPollDelayOf,
  submitProgressOf,
} from './submit-progress';

const NOW = Date.parse('2026-10-28T12:00:00.000Z');
const submit = (patch: Partial<ContributeAttemptSubmit> = {}): ContributeAttemptSubmit => ({
  step: 'PUSH',
  waitUntil: null,
  fork: 'octocat/driftwood',
  branch: 'gitranks/871',
  lastError: null,
  ...patch,
});
const statesOf = (progress: ReturnType<typeof submitProgressOf>) => progress.steps.map(({ state }) => state);

describe("the submission's steps", () => {
  it('reads the steps before the current one as done without a clock (an older API)', () => {
    const progress = submitProgressOf('SUBMITTING', submit());
    expect(statesOf(progress)).toEqual(['done', 'done', 'current', 'pending']);
    expect(progress.steps[0].durationMs).toBeNull();
    expect(progress.current?.step).toBe('PUSH');
    expect(progress.finished).toBe(false);
  });

  it('times each finished step, and the whole submission once the PR is open', () => {
    const steps = [
      { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:52.700Z' },
      { step: 'PUSH', startedAt: '2026-10-28T11:59:52.700Z', doneAt: '2026-10-28T11:59:57.600Z' },
      { step: 'PULL_REQUEST', startedAt: '2026-10-28T11:59:57.600Z', doneAt: '2026-10-28T11:59:59.900Z' },
    ] as const;
    const progress = submitProgressOf('PR_OPEN', submit({ step: 'PULL_REQUEST', steps: [...steps] }));
    expect(statesOf(progress)).toEqual(['done', 'skipped', 'done', 'done']);
    expect(progress.steps.map(({ durationMs }) => durationMs)).toEqual([2700, null, 4900, 2300]);
    expect(progress).toMatchObject({ finished: true, current: null, totalMs: 9900 });
  });

  it('reads a step with no time between its start and end as not timed', () => {
    const at = '2026-10-28T11:59:50.000Z';
    const progress = submitProgressOf(
      'PR_OPEN',
      submit({ step: 'PULL_REQUEST', steps: [{ step: 'PULL_REQUEST', startedAt: at, doneAt: at }] }),
    );
    expect(progress.steps[3]).toMatchObject({ state: 'done', durationMs: null });
  });

  it('fails no step for a bounce before the fork, and the step it stopped at otherwise', () => {
    const lastError = { reason: 'repo_busy', note: 'Busy.', at: '2026-10-28T11:59:00.000Z' };
    expect(statesOf(submitProgressOf('REVIEW', submit({ step: 'QUEUED', lastError })))).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    const stopped = submitProgressOf('STOPPED', submit({ step: 'PUSH', lastError }));
    expect(statesOf(stopped)).toEqual(['done', 'done', 'failed', 'pending']);
    expect(stopped.current?.state).toBe('failed');
  });

  it('waits for the next day with every step to come', () => {
    expect(statesOf(submitProgressOf('SUBMITTING', submit({ step: 'WAITING_CAP' })))).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
  });
});

describe('how long a step took', () => {
  it.each([
    [0, '0.0 s'],
    [2700, '2.7 s'],
    [9999, '9.9 s'],
    [42_400, '42 s'],
    [60_000, '1 min'],
    [185_000, '3 min 5 s'],
    [3_840_000, '1 h 4 min'],
    [-5, '0.0 s'],
  ])('%i ms reads %s', (ms, label) => {
    expect(durationLabel(ms)).toBe(label);
  });

  it('counts whole seconds for a running step', () => {
    expect(durationLabel(4300, { tenths: false })).toBe('4 s');
  });
});

describe('when the stepper reads again', () => {
  it('soon while a step runs, less often past a minute, near a retry, never while waiting for the day', () => {
    const running = submit({ stepStartedAt: new Date(NOW - 3000).toISOString() });
    expect(submitPollDelayOf('SUBMITTING', running, NOW)).toBe(SUBMIT_POLL_MS);
    const slow = submit({ step: 'FORK', stepStartedAt: new Date(NOW - 90_000).toISOString() });
    expect(submitPollDelayOf('SUBMITTING', slow, NOW)).toBe(SUBMIT_SLOW_POLL_MS);
    expect(submitPollDelayOf('SUBMITTING', submit({ retryAt: new Date(NOW + 8000).toISOString() }), NOW)).toBe(8000);
    expect(submitPollDelayOf('SUBMITTING', submit({ retryAt: new Date(NOW + 600_000).toISOString() }), NOW)).toBe(
      15_000,
    );
    expect(submitPollDelayOf('SUBMITTING', submit({ step: 'WAITING_CAP' }), NOW)).toBeNull();
    expect(submitPollDelayOf('PR_OPEN', running, NOW)).toBeNull();
  });
});
