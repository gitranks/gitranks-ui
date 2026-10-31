import type { Route } from 'next';

import { detailText, EVENT_LABELS } from './attempt-format';
import type { ContributeActivity, ContributeAgentRun, ContributeAgentRunPhase } from './contribute.types';
import { relativeLabel, usd } from './format';

/**
 * The user's agent runs as the activity read lists them (`runs`): the header's count, the sheet's and Overview's rows,
 * My contributions' live phase. Live runs come first, oldest first; settled ones (ready, done, stopped) stay ten
 * minutes, then the API leaves them out.
 */

type SettledPhase = Extract<ContributeAgentRunPhase, 'READY' | 'DONE' | 'STOPPED'>;

export const SETTLED_PHASES: readonly SettledPhase[] = ['READY', 'DONE', 'STOPPED'];

export const isSettled = (run: Pick<ContributeAgentRun, 'phase'>) =>
  (SETTLED_PHASES as readonly ContributeAgentRunPhase[]).includes(run.phase);

export const runsOf = (activity: ContributeActivity | null | undefined): ContributeAgentRun[] => activity?.runs ?? [];

/** Whether an agent works on one of them now: the poll goes fast, the header's dot moves. */
export const anyActive = (runs: readonly ContributeAgentRun[]) => runs.some(({ active }) => active);

/** The header's few words: what works, else what waits, else how the latest one ended; '' with no runs. */
export function indicatorLabelOf(runs: readonly ContributeAgentRun[]): string {
  const working = runs.filter(({ active }) => active).length;
  if (working) return `${working} ${working === 1 ? 'agent' : 'agents'} working`;
  const live = runs.filter((run) => !isSettled(run));
  const yours = live.filter(({ phase }) => phase === 'WAITING_FOR_YOU').length;
  if (yours) return yours === 1 ? 'Waiting for you' : `${yours} waiting for you`;
  if (live.length)
    return live.every(({ phase }) => phase === 'QUEUED') ? `${live.length} queued` : `${live.length} in progress`;
  const settled = runs.filter(isSettled);
  const latest = [...settled].sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''))[0];
  return latest ? SETTLED_TEXT[latest.phase as SettledPhase] : '';
}

/** The header's words on a phone: `2 working`, else the same. */
export const indicatorShortLabelOf = (runs: readonly ContributeAgentRun[]): string => {
  const working = runs.filter(({ active }) => active).length;
  return working ? `${working} working` : indicatorLabelOf(runs);
};

const SETTLED_TEXT: Record<SettledPhase, string> = {
  READY: 'Ready for you',
  DONE: 'Done',
  STOPPED: 'Stopped',
};

/** A run's few words of state, settled ones as the user acts on them. */
export const phaseTextOf = (run: Pick<ContributeAgentRun, 'phase' | 'label'>) =>
  isSettled(run) ? SETTLED_TEXT[run.phase as SettledPhase] : run.label;

/** The steps a run walks, and the one it is on (0-based; past the last once it is done). */
export function stepsOf(run: Pick<ContributeAgentRun, 'phase' | 'kind'>): { steps: string[]; at: number } {
  const followUp = run.kind === 'FOLLOW_UP';
  const steps = followUp
    ? ['Queued', 'Addressing review', 'Checks', 'Ready', 'Pushed']
    : ['Queued', 'Checking the issue', 'Working', 'Checks', 'Ready'];
  const order: Partial<Record<ContributeAgentRunPhase, number>> = followUp
    ? { QUEUED: 0, ADDRESSING_REVIEW: 1, RUNNING_CHECKS: 2, WAITING_FOR_YOU: 3, READY: 3, SUBMITTING: 4, DONE: 5 }
    : {
        QUEUED: 0,
        CHECKING_ISSUE: 1,
        WORKING: 2,
        RUNNING_CHECKS: 3,
        WAITING_FOR_YOU: 4,
        READY: 4,
        SUBMITTING: 5,
        DONE: 5,
      };
  return { steps, at: order[run.phase] ?? 0 };
}

/** `42 s`, `12 min`, `1 h 05 min`. */
export function durationLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/**
 * The user's own agent gone quiet (no call in the last 10 minutes, so not counted as working): when it last called, as
 * of the read. Null for a hosted run, a working agent, or a settled run.
 */
export function quietAgentOf(
  run: Pick<ContributeAgentRun, 'runner' | 'active' | 'phase' | 'lastCallAt'>,
  readAt: string,
): string | null {
  if (run.runner !== 'MCP' || run.active || isSettled(run) || run.phase === 'QUEUED') return null;
  return run.lastCallAt ? `last call ${relativeLabel(run.lastCallAt, new Date(readAt))}` : 'no call yet';
}

/** `$0.42 of $2`; null for the user's own agent, and while queued (nothing spent yet). */
export const spendLabelOf = ({
  spendUsd,
  budgetUsd,
  phase,
}: Pick<ContributeAgentRun, 'spendUsd' | 'budgetUsd' | 'phase'>) =>
  spendUsd === null || budgetUsd === null || phase === 'QUEUED'
    ? null
    : `${usd(Math.round(spendUsd * 100) / 100)} of ${usd(budgetUsd)}`;

/** Who queued it, as the API notes it on the first event: the scheduler, the user, or a follow-up's starter. */
const QUEUED_BY: Record<string, string> = {
  scheduler: 'Picked for you',
  user: 'Queued by you',
  'follow_up: user': 'Follow-up you started',
  'follow_up: autopilot': 'Follow-up started by autopilot',
};

/** The latest line of its timeline, as the attempt's page words it; who queued it while queued. */
export function eventLineOf({ latestEvent }: Pick<ContributeAgentRun, 'latestEvent'>): string | null {
  if (!latestEvent) return null;
  const detail = latestEvent.detail?.trim() ?? '';
  if (latestEvent.state === 'QUEUED') return QUEUED_BY[detail] ?? EVENT_LABELS.QUEUED;
  // A session's id says nothing to the user: "session s_1: go/no-go on $0.20" reads "go/no-go on $0.20".
  return detailText(detail.replace(/^session \S+: /, '')) || EVENT_LABELS[latestEvent.state] || null;
}

const attemptPath = (attemptId: string) => `/contribute/attempts/${encodeURIComponent(attemptId)}` as Route;

/** Where a run's row leads, and what its link says. */
export function runLinkOf(run: Pick<ContributeAgentRun, 'attemptId' | 'phase'>): { href: Route; label: string } {
  const href = attemptPath(run.attemptId);
  if (run.phase === 'READY' || run.phase === 'WAITING_FOR_YOU') return { href, label: 'Review' };
  return { href, label: run.phase === 'DONE' ? 'See it' : 'Details' };
}

/** `acme/widgets#42`. */
export const runRefOf = ({ nameWithOwner, number }: Pick<ContributeAgentRun, 'nameWithOwner' | 'number'>) =>
  `${nameWithOwner ?? 'a repo'}#${number}`;

/** A run's title, as a heading falls back to it. */
export const runTitleOf = ({ title, number }: Pick<ContributeAgentRun, 'title' | 'number'>) =>
  title?.trim() || `Issue #${number}`;

/**
 * The newer of two reads of the runs: the page's (server-rendered) or the poll's. The poll's once it read at or after
 * the page's.
 */
export function newerActivity(
  page: ContributeActivity | null | undefined,
  polled: ContributeActivity | null | undefined,
): ContributeActivity | null {
  if (!polled) return page ?? null;
  if (!page) return polled;
  return polled.readAt >= page.readAt ? polled : page;
}
