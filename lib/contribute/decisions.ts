import { checkLimitOf, limitNoteOf } from './attempt-format';
import type { ContributeAttemptDetail, ContributeGoNoGo } from './contribute.types';
import { usd } from './format';

/** The check's cap as the API words a stop with no verdict: "the check's $0.60 budget ran out", "15-minute limit". */
const CHECK_CAP = /the check's (?:\$([\d.]+) budget|(\d+)-minute limit) ran out/;

type StopFields = Pick<ContributeAttemptDetail, 'endReason' | 'endDetail' | 'checkLimit' | 'budgetUsd' | 'costUsd'>;

/**
 * A run that stopped at a limit, in words: "Stopped at the $0.60 check limit after $0.61." The go/no-go check's budget
 * or time with no verdict (its cap read from the API's words, when they name it), or the run's own budget or two
 * hours; null for any other end.
 */
export function limitStopOf(attempt: StopFields): string | null {
  const after = `after ${usd(attempt.costUsd)}`;
  const limit = checkLimitOf(attempt);
  if (limit && !limit.decided) {
    const cap = attempt.endDetail ? CHECK_CAP.exec(attempt.endDetail) : null;
    if (limit.limit === 'time') {
      return cap?.[2]
        ? `Stopped at the ${cap[2]}-minute check limit ${after}.`
        : `Stopped at the check's time limit ${after}.`;
    }
    return cap?.[1]
      ? `Stopped at the ${usd(Number(cap[1]))} check limit ${after}.`
      : `Stopped at the check's budget limit ${after}.`;
  }
  if (attempt.endReason === 'BUDGET') return `Stopped at your ${usd(attempt.budgetUsd)} limit per run ${after}.`;
  if (attempt.endReason === 'TIMEOUT') return `Stopped at the two-hour limit per run ${after}.`;
  return null;
}

/** What the run page shows of the agent's decisions; null when there is nothing to show (an older run, say). */
export type RunDecisions = {
  goNoGo: ContributeGoNoGo | null;
  /** The note under a go/no-go the agent wrote when told to wrap up at the check's cap. */
  limitNote: string | null;
  /** A stop at a limit, in words, and what the agent was on when the check ran out. */
  stop: { text: string; detail: string | null } | null;
  /** "What the agent found": left out when it only repeats the go/no-go's reason (a no-go's brief is its reason). */
  brief: string | null;
};

type DecisionFields = StopFields & Pick<ContributeAttemptDetail, 'goNoGo' | 'brief'>;

export function runDecisionsOf(attempt: DecisionFields): RunDecisions | null {
  // An API that doesn't serve the decisions leaves the page as it was, a limit stop's wording too.
  if (attempt.goNoGo === undefined) return null;
  const goNoGo = attempt.goNoGo;
  const text = limitStopOf(attempt);
  const ranOut = !!text && attempt.endReason === 'NO_GO';
  const stop = text ? { text, detail: ranOut ? attempt.endDetail : null } : null;
  const brief = attempt.brief?.trim() || null;
  const shownBrief = brief && brief !== goNoGo?.reason.trim() ? brief : null;
  if (!goNoGo && !stop && !shownBrief) return null;
  return {
    goNoGo,
    limitNote: goNoGo?.decidedAtLimit ? limitNoteOf({ limit: goNoGo.decidedAtLimit, decided: true }) : null,
    stop,
    brief: shownBrief,
  };
}

/**
 * What the status box leaves to the decisions card: a no-go's reason (or what the check was on when it ran out), and
 * the note that the agent decided at the check's cap.
 */
export function shownByDecisions(attempt: DecisionFields): { noGoDetail: boolean; limitNote: boolean } {
  const decisions = runDecisionsOf(attempt);
  return {
    noGoDetail: !!decisions && attempt.endReason === 'NO_GO',
    limitNote: !!decisions?.limitNote,
  };
}
