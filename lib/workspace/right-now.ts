import type { ContributeAgentRun } from './contribute.types';
import { relativeLabel } from './format';
import { isLearnRun, isWorkingPhase } from './run-steps';

/**
 * Right now, on both front tabs: the runs an agent works on at this moment, each tab its own side's. Absent with none.
 */

/** Which front tab a run shows on. */
export type RunSide = 'fix' | 'learn';

/** A run's side: Learn's (`isLearnRun`), else Contribute's. */
export const runSideOf = (run: Pick<ContributeAgentRun, 'mode' | 'phase'>): RunSide =>
  isLearnRun(run) ? 'learn' : 'fix';

/** The runs one tab's Right now shows, a lane each: the hosted agent's, and the person's own agent's. */
export function rightNowOf(
  runs: readonly ContributeAgentRun[],
  side: RunSide,
): { hosted: ContributeAgentRun[]; own: ContributeAgentRun[] } {
  const shown = runs.filter((run) => isWorkingPhase(run) && runSideOf(run) === side);
  return {
    hosted: shown.filter(({ runner }) => runner !== 'MCP'),
    own: shown.filter(({ runner }) => runner === 'MCP'),
  };
}

/** "1 agent working", "3 agents working". */
export const workingLabelOf = (count: number) => `${count} ${count === 1 ? 'agent' : 'agents'} working`;

/** The own agent's lane, by default: when it last called, the newest call of its runs; null with none. */
export function lastCallOf(runs: readonly Pick<ContributeAgentRun, 'lastCallAt'>[], readAt: string): string | null {
  const latest = runs
    .map(({ lastCallAt }) => lastCallAt)
    .filter((at): at is string => !!at)
    .sort()
    .at(-1);
  return latest ? `last call ${relativeLabel(latest, new Date(readAt))}` : null;
}

/** A follow-up's pull request, as its address names it; null without one. */
export function runPrOf({ prUrl }: Pick<ContributeAgentRun, 'prUrl'>): { number: number; url: string } | null {
  const number = Number(/\/pull\/(\d+)/.exec(prUrl ?? '')?.[1]);
  return prUrl && number > 0 ? { number, url: prUrl } : null;
}
