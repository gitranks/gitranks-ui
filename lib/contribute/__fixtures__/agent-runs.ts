import type { ContributeActivity, ContributeAgentRun } from '../contribute.types';

/** The user's agent runs as the activity read answers them, one of each kind of row. */

export const RUNS_READ_AT = '2026-10-31T12:00:00.000Z';

export const runOf = (fields: Partial<ContributeAgentRun> = {}): ContributeAgentRun => ({
  attemptId: 'att_working',
  nameWithOwner: 'acme/widgets',
  number: 42,
  title: 'Crash on empty input',
  kind: 'FIRST',
  runner: 'MANAGED_AGENTS',
  state: 'RUNNING',
  phase: 'WORKING',
  label: 'Working on a fix',
  active: true,
  queuedAt: '2026-10-31T11:45:00.000Z',
  startedAt: '2026-10-31T11:48:00.000Z',
  settledAt: null,
  elapsedSeconds: 12 * 60,
  spendUsd: 0.42,
  budgetUsd: 2,
  latestEvent: {
    state: 'RUNNING',
    detail: 'go: budget raised to $1.80, the work sent',
    at: '2026-10-31T11:50:00.000Z',
  },
  queuePosition: null,
  lastCallAt: null,
  autosubmitAt: null,
  endReason: null,
  prUrl: null,
  ...fields,
});

export const WORKING = runOf();
export const FOLLOW_UP = runOf({
  attemptId: 'att_follow_up',
  nameWithOwner: 'recharts/recharts',
  number: 8136,
  title: 'Tooltip flickers on resize',
  kind: 'FOLLOW_UP',
  phase: 'ADDRESSING_REVIEW',
  label: 'Addressing review',
  elapsedSeconds: 4 * 60 + 20,
  spendUsd: 0.18,
  budgetUsd: 1,
  latestEvent: { state: 'RUNNING', detail: 'session s_9: work on $0.90', at: '2026-10-31T11:56:00.000Z' },
});
export const QUEUED = runOf({
  attemptId: 'att_queued',
  nameWithOwner: 'shields/shields',
  number: 7929,
  title: 'Badge for npm provenance',
  state: 'QUEUED',
  phase: 'QUEUED',
  label: 'Queued, 1st in line',
  active: false,
  startedAt: null,
  elapsedSeconds: 3 * 60,
  spendUsd: 0,
  queuePosition: 1,
  latestEvent: { state: 'QUEUED', detail: 'scheduler', at: '2026-10-31T11:57:00.000Z' },
});
export const READY = runOf({
  attemptId: 'att_ready',
  nameWithOwner: 'vitejs/vite',
  number: 18001,
  title: 'Wrong base path in preview',
  state: 'REVIEW',
  phase: 'READY',
  label: 'Ready for you',
  active: false,
  settledAt: '2026-10-31T11:58:00.000Z',
  elapsedSeconds: 31 * 60,
  spendUsd: 1.37,
  latestEvent: { state: 'REVIEW', detail: null, at: '2026-10-31T11:58:00.000Z' },
});

export const activityOf = (...runs: ContributeAgentRun[]): ContributeActivity => ({
  items: [],
  runs,
  readAt: RUNS_READ_AT,
});
