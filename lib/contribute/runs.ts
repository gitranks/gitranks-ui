import {
  AGENT_NAMES,
  CHECK_LABELS,
  checkLimitOf,
  detailText,
  END_REASONS,
  noGoReasonOf,
  type Tone,
} from './attempt-format';
import type {
  ContributeAgent,
  ContributeAttemptCheckName,
  ContributeAttemptEndReason,
  ContributeAttemptKind,
  ContributeAttemptRunner,
  ContributeAttemptState,
  ContributeEffort,
  ContributeModel,
} from './contribute.types';
import { EFFORTS, MODELS } from './format';

/** The Runs page: every run the user's agents made, newest first, a page at a time, with totals over the filter. */

export type ContributeRunOutcome =
  | 'RUNNING'
  | 'REVIEW'
  | 'PR_OPEN'
  | 'MERGED'
  | 'CLOSED'
  | 'PUSHED'
  | 'NO_GO'
  | 'CHECKS_FAILED'
  | 'NOT_STARTED'
  | 'STOPPED'
  | 'DISCARDED';
export type ContributeRunOutcomeFilter = 'PR' | 'NO_GO' | 'CHECKS_FAILED' | 'STOPPED' | 'NOT_STARTED';
export type ContributeNoGoCategory =
  | 'NEEDS_DESIGN'
  | 'CANNOT_REPRODUCE'
  | 'ALREADY_FIXED'
  | 'BOT_HANDLED'
  | 'TOO_BIG'
  | 'OTHER'
  | 'OUT_OF_BUDGET';

export type ContributeRun = {
  attemptId: string;
  nameWithOwner: string | null;
  number: number;
  title: string | null;
  kind: ContributeAttemptKind;
  followUpOf: { attemptId: string; number: number } | null;
  followUps: number;
  runner: ContributeAttemptRunner;
  model: ContributeModel | null;
  effort: ContributeEffort | null;
  agent: ContributeAgent | null;
  queuedBy: string;
  state: ContributeAttemptState;
  outcome: ContributeRunOutcome;
  endReason: ContributeAttemptEndReason | null;
  endDetail: string | null;
  noGoCategory: ContributeNoGoCategory | null;
  pullRequest: { number: number; url: string | null } | null;
  costUsd: number;
  goNoGoUsd: number;
  workUsd: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ContributeRunsTotals = {
  runs: number;
  started: number;
  costUsd: number;
  prs: number;
  merged: number;
  closed: number;
  noGo: number;
  noGoCostUsd: number;
  noGoByCategory: { category: ContributeNoGoCategory; count: number }[];
};

export type ContributeRunsPage = {
  items: ContributeRun[];
  nextCursor: string | null;
  totals: ContributeRunsTotals;
  outcomeCounts: { outcome: ContributeRunOutcomeFilter | 'ALL'; count: number }[];
  repos: string[];
  days: ContributeRunsDay[];
};

export type ContributeRunsDay = { day: string; runs: number; costUsd: number; prs: number };

export type ContributeRunsFilter = {
  outcome?: ContributeRunOutcomeFilter;
  category?: ContributeNoGoCategory;
  repo?: string;
  runner?: ContributeAttemptRunner;
  from?: string;
};

/** A page's size: the API's most. */
export const RUNS_PAGE_SIZE = 50;

export const RUN_OUTCOMES: Record<ContributeRunOutcome, { label: string; tone: Tone | 'quiet' }> = {
  RUNNING: { label: 'Agent working', tone: 'violet' },
  REVIEW: { label: 'Ready for your review', tone: 'violet' },
  PR_OPEN: { label: 'PR open', tone: 'green' },
  MERGED: { label: 'Merged', tone: 'violet' },
  CLOSED: { label: 'PR closed', tone: 'red' },
  PUSHED: { label: 'Pushed to the PR', tone: 'green' },
  NO_GO: { label: 'No-go', tone: 'neutral' },
  CHECKS_FAILED: { label: 'Checks failed', tone: 'amber' },
  NOT_STARTED: { label: "Didn't start", tone: 'quiet' },
  STOPPED: { label: 'Stopped', tone: 'neutral' },
  DISCARDED: { label: 'Discarded', tone: 'neutral' },
};

/** An outcome's words and colour; one this page does not know yet reads as Stopped. */
export const outcomeOf = (outcome: ContributeRunOutcome) => RUN_OUTCOMES[outcome] ?? RUN_OUTCOMES.STOPPED;

/** The outcome chips, in order, after All. */
export const OUTCOME_FILTERS: { value: ContributeRunOutcomeFilter; label: string }[] = [
  { value: 'PR', label: 'Pull requests' },
  { value: 'NO_GO', label: 'No-go' },
  { value: 'CHECKS_FAILED', label: 'Checks failed' },
  { value: 'STOPPED', label: 'Stopped' },
  { value: 'NOT_STARTED', label: "Didn't start" },
];

/** Each no-go category's words and its colour on the bar (a series colour, in a fixed order). */
export const NO_GO_CATEGORIES: Record<ContributeNoGoCategory, { label: string; color: string }> = {
  NEEDS_DESIGN: { label: 'Needs design', color: 'var(--series-1)' },
  CANNOT_REPRODUCE: { label: "Can't reproduce", color: 'var(--series-2)' },
  ALREADY_FIXED: { label: 'Already fixed', color: 'var(--series-3)' },
  BOT_HANDLED: { label: 'Handled by a bot', color: 'var(--series-4)' },
  TOO_BIG: { label: 'Too big', color: 'var(--series-5)' },
  OTHER: { label: 'Other', color: 'var(--series-other)' },
  OUT_OF_BUDGET: { label: 'Ran out before deciding', color: 'var(--series-6)' },
};

export type RunsRange = '7d' | '30d' | '90d' | 'all';
export const RANGES: { value: RunsRange; label: string; days: number | null }[] = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'all', label: 'All time', days: null },
];
export const DEFAULT_RANGE: RunsRange = '30d';

/** The page's query, as the URL keeps it: the filters alone, never a cursor. */
export type RunsQuery = {
  outcome?: ContributeRunOutcomeFilter;
  reason?: ContributeNoGoCategory;
  repo?: string;
  runner?: ContributeAttemptRunner;
  range: RunsRange;
};

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const lowerOf = <T extends string>(values: readonly T[]) =>
  new Map(values.map((value) => [value.toLowerCase(), value]));

const OUTCOME_PARAMS = lowerOf(OUTCOME_FILTERS.map(({ value }) => value));
const CATEGORY_PARAMS = lowerOf(Object.keys(NO_GO_CATEGORIES) as ContributeNoGoCategory[]);
const RUNNER_PARAMS = new Map<string, ContributeAttemptRunner>([
  ['hosted', 'MANAGED_AGENTS'],
  ['own', 'MCP'],
]);
/** `owner/name`: an owner is letters, digits and hyphens; a name may not be `.` or `..`. */
const REPO = /^[A-Za-z0-9-]+\/(?!\.\.?$)[A-Za-z0-9_.-]+$/;

/** The filters from the URL (`?outcome=no_go&reason=needs_design&repo=a/b&runner=own&range=7d`); unknown values drop. */
export function runsQueryOf(params: Params): RunsQuery {
  const repo = one(params.repo);
  const range = RANGES.find(({ value }) => value === one(params.range))?.value ?? DEFAULT_RANGE;
  const outcome = OUTCOME_PARAMS.get(one(params.outcome) ?? '');
  const reason = CATEGORY_PARAMS.get(one(params.reason) ?? '');
  const runner = RUNNER_PARAMS.get(one(params.runner) ?? '');
  return {
    ...(outcome ? { outcome } : {}),
    ...(reason ? { reason } : {}),
    ...(repo && repo.length <= 140 && REPO.test(repo) ? { repo } : {}),
    ...(runner ? { runner } : {}),
    range,
  };
}

/** The page's URL for a query; the defaults stay out of it. */
export function runsHref(query: RunsQuery): string {
  const search = new URLSearchParams();
  if (query.outcome) search.set('outcome', query.outcome.toLowerCase());
  if (query.reason) search.set('reason', query.reason.toLowerCase());
  if (query.repo) search.set('repo', query.repo);
  if (query.runner) search.set('runner', query.runner === 'MCP' ? 'own' : 'hosted');
  if (query.range !== DEFAULT_RANGE) search.set('range', query.range);
  const text = search.toString();
  return text ? `/contribute/runs?${text}` : '/contribute/runs';
}

/** Whether any filter is set beyond the default dates. */
export const isFiltered = (query: RunsQuery) =>
  !!(query.outcome || query.reason || query.repo || query.runner || query.range !== DEFAULT_RANGE);

/** A range's start as `runsFilterOf` writes it: midnight UTC. */
export const RANGE_START = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/;

/** The API's filter for a query; the range counts back from `now`, to the start of that UTC day. */
export function runsFilterOf(query: RunsQuery, now = new Date()): ContributeRunsFilter {
  const days = RANGES.find(({ value }) => value === query.range)?.days ?? null;
  const from = days
    ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1)).toISOString()
    : undefined;
  return {
    ...(query.reason ? { category: query.reason } : query.outcome ? { outcome: query.outcome } : {}),
    ...(query.repo ? { repo: query.repo } : {}),
    ...(query.runner ? { runner: query.runner } : {}),
    ...(from ? { from } : {}),
  };
}

/** `owner/name#12`, or `#12` while the repo is not known. */
export const issueRefOf = (run: Pick<ContributeRun, 'nameWithOwner' | 'number'>) =>
  `${run.nameWithOwner ?? ''}#${run.number}`;

export const runTitleOf = (run: Pick<ContributeRun, 'title' | 'number'>) => run.title?.trim() || `Issue #${run.number}`;

/** `Hosted · Sonnet 5.5`, or the user's own agent by the name it gave. */
export function runnerLabelOf(run: Pick<ContributeRun, 'runner' | 'model' | 'agent'>): string {
  if (run.runner === 'MCP') return run.agent ? (AGENT_NAMES[run.agent.name] ?? 'Your agent') : 'Your agent';
  const model = run.model ? MODELS[run.model] : undefined;
  return model ? `Hosted · ${model.replace(/^Claude /, '')}` : 'Hosted';
}

export const effortLabelOf = (effort: ContributeEffort | null) => (effort ? EFFORTS[effort].toLowerCase() : '');

/** `1m 02s`, `45s`; '' for a run that has not started or not finished. */
export function durationLabel(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return '';
  const seconds = Math.max(0, Math.round((Date.parse(finishedAt) - Date.parse(startedAt)) / 1000));
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/** What a failed check reads as: the check that failed, from the code the API keeps. */
const FAILED_CHECKS: Record<ContributeAttemptCheckName, string> = {
  PATCH_PARSED: 'The patch did not read as a valid change',
  NOT_EMPTY: 'The change was empty',
  MAX_CHANGED_LINES: 'Over your limit of changed lines',
  MAX_FILES: 'Over your limit of files',
  WORKFLOW_PATHS: 'It changed a workflow',
  CI_CONFIG: 'It changed CI config',
  LOCKFILES: 'It changed an unrelated lockfile',
  LICENSE_FILES: 'It changed a license file',
  BINARY_FILES: 'It added a binary file',
  SECRETS: 'A secret in the diff',
  TESTS_PASSED: 'The tests did not pass',
  TEST_TOUCHED: 'No test was added or updated',
};

/** Why the issue was not open to work when the run came to start it. */
const NOT_STARTED: Record<string, string> = {
  gone: 'The issue is gone from GitHub',
  closed: 'The issue was closed',
  locked: 'The issue was locked',
  too_old: 'The issue was too old to take',
  assigned: 'Someone is assigned to it',
  claimed_in_comments: 'Someone claimed it in the comments',
  linked_pr: 'A PR is already linked to it',
  merged_pr: 'A merged PR already fixed it',
  ref_pr: 'Another PR already references it',
  rejected_prs: 'Its maintainers turned outside PRs down lately',
  beginner_label_removed: 'Its beginner label was taken off',
  new_comment: 'A new comment changed it',
  dropped: 'It left the pool of issues',
  repo_left: 'Its repo left the pool',
  no_answer: 'GitHub did not answer the check',
};

/** The first sentence of the agent's reason, so the line reads whole when cut. */
const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

/** The run's line under its outcome: the PR, the no-go's reason, the check that failed, or why it ended. */
export function runReasonOf(run: ContributeRun): string {
  const number = run.pullRequest?.number ?? run.followUpOf?.number;
  const pr = number ? `PR #${number}` : 'The PR';
  switch (run.outcome) {
    case 'PR_OPEN':
      return `${pr} · waiting on maintainers`;
    case 'MERGED':
      return `${pr} merged`;
    case 'CLOSED':
      return `${pr} closed without merging`;
    case 'PUSHED':
      return number ? `Pushed to PR #${number}` : 'Pushed to the PR';
    case 'REVIEW':
      return 'Waiting for your review';
    case 'RUNNING':
      return '';
    case 'NO_GO': {
      if (!run.endDetail) return '';
      const limit = checkLimitOf(run);
      // No verdict by the check's limit: the fixed words (its detail quotes a step, which a cut could split).
      if (limit && !limit.decided) {
        return limit.limit === 'time'
          ? 'Ran out of time while checking the issue'
          : 'Ran out of budget while checking the issue';
      }
      // The agent's reason, written at the check's limit: its first sentence and the note, like any no-go reason.
      const reason = firstSentence(detailText(noGoReasonOf(run.endDetail)));
      return limit?.decided ? `${reason} · decided at the check's limit` : reason;
    }
    case 'CHECKS_FAILED': {
      const code = run.endDetail?.toUpperCase() as ContributeAttemptCheckName | undefined;
      return (code && FAILED_CHECKS[code]) || (code && CHECK_LABELS[code] ? `Failed: ${CHECK_LABELS[code]}` : '');
    }
    case 'NOT_STARTED':
      return (run.endDetail && NOT_STARTED[run.endDetail]) || detailText(run.endDetail) || END_REASONS.CLAIM_LOST;
    default:
      return run.endReason ? END_REASONS[run.endReason] : detailText(run.endDetail);
  }
}

/** A run's start day, `2026-10-31` (UTC, as the API counts days). */
export const dayKeyOf = (iso: string) => iso.slice(0, 10);

/** `Today · Sat, Oct 31`, `Yesterday · Fri, Oct 30`, `Thu, Oct 29`: a day row's label, in UTC. */
export function dayRowLabel(day: string, now = new Date()): string {
  const date = new Date(`${day}T12:00:00Z`);
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
  return day === today ? `Today · ${label}` : day === yesterday ? `Yesterday · ${label}` : label;
}

/** `09:12`, UTC. */
export const timeOfDay = (iso: string) => iso.slice(11, 16);

/** One line of the list: a run, or runs that never started on one issue back to back, folded into one. */
export type RunLine = { kind: 'run'; run: ContributeRun } | { kind: 'folded'; runs: ContributeRun[] };
export type RunDay = { day: string; lines: RunLine[] };

/**
 * The runs by UTC day, newest first, with back-to-back runs that never started on the same issue folded into one line
 * (the scheduler's retries: no session, no cost).
 */
export function runDaysOf(runs: ContributeRun[]): RunDay[] {
  const days: RunDay[] = [];
  for (const run of runs) {
    const day = dayKeyOf(run.createdAt);
    let current = days.at(-1);
    if (current?.day !== day) {
      current = { day, lines: [] };
      days.push(current);
    }
    const last = current.lines.at(-1);
    if (run.outcome === 'NOT_STARTED' && last?.kind === 'folded' && issueRefOf(last.runs[0]) === issueRefOf(run)) {
      last.runs.push(run);
    } else {
      current.lines.push(run.outcome === 'NOT_STARTED' ? { kind: 'folded', runs: [run] } : { kind: 'run', run });
    }
  }
  return days;
}

/** `25 runs · $2.28 · 4 PRs`: a day row's sums, over every run of the day the filter matches. */
export function daySumLabel(day: ContributeRunsDay | undefined, usd: (amount: number) => string): string {
  if (!day) return '';
  const parts = [`${day.runs} run${day.runs === 1 ? '' : 's'}`, usd(day.costUsd)];
  if (day.prs) parts.push(`${day.prs} PR${day.prs === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** `42%`, or `—` with nothing to divide by. */
export const percentLabel = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');
