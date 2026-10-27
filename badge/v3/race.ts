import type { RepoFacts, UserFacts } from './facts';
import { monthKey, monthKeysOf } from './month';

/** The month race (spec §3.5): this month's gain against last month's. */
export type RaceState =
  | { kind: 'hidden' }
  | { kind: 'plain' }
  | { kind: 'behind'; toBeat: number }
  | { kind: 'beaten' }
  | { kind: 'record' };

export type RaceInput = {
  /** This month's gain; `null` when unknown. */
  current: number | null;
  /** Last month's gain; `null` when unknown. */
  last: number | null;
  /** The best gain of every earlier month, where a full history is known (repositories only). */
  best?: number | null;
  dayOfMonth: number;
};

/** Before this day of the month a race is not called yet. */
export const RACE_FROM_DAY = 4;
/** A gain under this is too small to race. */
export const RACE_MIN_GAIN = 3;
/** A record month needs at least this gain. */
export const RECORD_MIN_GAIN = 10;

export function raceState({ current, last, best, dayOfMonth }: RaceInput): RaceState {
  if (current === null || current <= 0) {
    return { kind: 'hidden' };
  }
  if (dayOfMonth < RACE_FROM_DAY) {
    return { kind: 'plain' };
  }
  if (best !== null && best !== undefined && current > best && current >= RECORD_MIN_GAIN) {
    return { kind: 'record' };
  }
  if (current < RACE_MIN_GAIN || last === null || last <= 0) {
    return { kind: 'plain' };
  }
  return current > last ? { kind: 'beaten' } : { kind: 'behind', toBeat: last - current + 1 };
}

const numberOr = (value: number | null | undefined) => (typeof value === 'number' ? value : null);

/** The month key of an ISO date that falls on the 1st of a month at midnight UTC; `null` for any other moment. */
function monthStartKeyOf(date: string): string | null {
  const time = Date.parse(date);
  if (!Number.isFinite(time)) return null;
  const at = new Date(time);
  if (at.getUTCDate() !== 1 || at.getUTCHours() || at.getUTCMinutes() || at.getUTCSeconds()) return null;
  return monthKey(at.getUTCFullYear(), at.getUTCMonth());
}

/**
 * The best month of a star history: the largest gain between two month starts exactly one month apart, over the
 * months completed before `thisKey` (this month never counts). `null` unless the history is complete: a partial one
 * would call a record against months it never saw.
 */
export function bestCompletedMonth(history: RepoFacts['history'], thisKey: string): number | null {
  if (!history?.complete) return null;
  const starts = new Map<string, number>();
  for (const { date, stars } of history.points) {
    const key = monthStartKeyOf(date);
    if (key && key <= thisKey) starts.set(key, stars);
  }
  let best: number | null = null;
  for (const [key, stars] of starts) {
    const next = starts.get(nextMonthKey(key));
    if (next !== undefined && nextMonthKey(key) <= thisKey) {
      best = Math.max(best ?? Number.NEGATIVE_INFINITY, next - stars);
    }
  }
  return best;
}

const nextMonthKey = (key: string) => monthKey(Number(key.slice(0, 4)), Number(key.slice(5, 7)));

/** A repository's race from its month starts; `best` only with a star history. */
export function repoRace(repo: Pick<RepoFacts, 'gainedThisMonth' | 'monthStarts' | 'history'>, now: Date) {
  const { thisKey, lastKey, lastName, dayOfMonth } = monthKeysOf(now);
  const thisStart = numberOr(repo.monthStarts?.[thisKey]);
  const lastStart = numberOr(repo.monthStarts?.[lastKey]);
  const current = numberOr(repo.gainedThisMonth);
  const last = thisStart !== null && lastStart !== null ? thisStart - lastStart : null;
  const best = bestCompletedMonth(repo.history, thisKey);

  return { current, last, lastName, state: raceState({ current, last, best, dayOfMonth }) };
}

/** Stars gained on a developer's own repositories, this month against last (no record state). */
export function userStarsRace(user: Pick<UserFacts, 's' | 'snapshots'>, now: Date) {
  const { thisKey, lastKey, lastName, dayOfMonth } = monthKeysOf(now);
  const thisStart = numberOr(user.snapshots?.[thisKey]?.s);
  const lastStart = numberOr(user.snapshots?.[lastKey]?.s);
  const score = numberOr(user.s);
  const current = score !== null && thisStart !== null ? score - thisStart : null;
  const last = thisStart !== null && lastStart !== null ? thisStart - lastStart : null;

  return { current, last, lastName, state: raceState({ current, last, dayOfMonth }) };
}

/** Places climbed in the global stars rank, this month against last. */
export function userClimbRace(user: Pick<UserFacts, 'rankGlobal' | 'rankSnapshots'>, now: Date) {
  const { thisKey, lastKey, lastName, dayOfMonth } = monthKeysOf(now);
  const rank = numberOr(user.rankGlobal?.s);
  const startRank = numberOr(user.rankGlobal?.sM) ?? numberOr(user.rankSnapshots?.[thisKey]?.s);
  const thisStart = numberOr(user.rankSnapshots?.[thisKey]?.s) ?? startRank;
  const lastStart = numberOr(user.rankSnapshots?.[lastKey]?.s);
  const current = rank !== null && startRank !== null ? startRank - rank : null;
  const last = thisStart !== null && lastStart !== null ? lastStart - thisStart : null;

  return { current, last, lastName, rank, state: raceState({ current, last, dayOfMonth }) };
}
