import { effectiveSettingOf } from './access-limits';
import type { ContributeLimits, ContributeScheduleCounts, ContributeSettings } from './contribute.types';

/**
 * The one sentence for the limit on open pull requests (decision 7), wherever a page says it: the Pull requests tab,
 * the front tabs, Learn home and the Learn start page. `count`: what the limit counts (the pull requests open and those
 * on their way to one, both sides); `limit`: the limit that holds now; `open`: the open ones, when known. A page never
 * writes its own.
 */
export type LimitCounts = { count: number; limit: number; open?: number | null };

/** The sentence in two parts: its lead (set in bold) and the rest. */
export function limitWordsOf({ count, open }: LimitCounts): { lead: string; rest: string } {
  if (!count) {
    return {
      lead: 'Your open pull requests are waiting on maintainers.',
      rest: 'A new one can start when one is merged or closed.',
    };
  }
  if (typeof open === 'number' && open < count) {
    return {
      lead: `${count} of your pull requests are open or on their way.`,
      rest: `${open} ${open === 1 ? 'waits' : 'wait'} on maintainers, ${count - open} on you. A new one can start when one is merged, closed or discarded.`,
    };
  }
  return {
    lead: `${count} of your pull requests ${count === 1 ? 'is' : 'are'} waiting on maintainers.`,
    rest: 'A new one can start when one is merged or closed.',
  };
}

/** The Pull requests tab's line under its title: "3 of 8 open at a time", "8 of 8 open or on their way". */
export function limitLineOf({ count, limit, open }: LimitCounts): string {
  return typeof open === 'number' && open < count
    ? `${count} of ${limit} open or on their way`
    : `${count} of ${limit} open at a time`;
}

/**
 * At the open pull request limit: what the limit counts (`prBound`) has reached what holds (the setting, the level's
 * cap, or a limit set for the account). Null while either is not known, or below the limit.
 */
export function limitReachedOf(
  counts: Pick<ContributeScheduleCounts, 'prBound'> | null | undefined,
  settings: Pick<ContributeSettings, 'attemptsAtATime' | 'openPrsAtATime'> | null | undefined,
  limits: ContributeLimits | null | undefined,
): LimitCounts | null {
  const limit = settings
    ? effectiveSettingOf(settings, limits, 'openPrsAtATime')
    : typeof limits?.openPrsEffective === 'number'
      ? limits.openPrsEffective
      : null;
  if (typeof counts?.prBound !== 'number' || typeof limit !== 'number') return null;
  return counts.prBound >= limit ? { count: counts.prBound, limit } : null;
}
