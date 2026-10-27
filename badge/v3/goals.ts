import type { RankGoal } from './facts';
import { formatFull } from './format';

/** The round ranks a goal can name (spec §3.4). */
export const ROUND_RANKS = [
  10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000,
] as const;

/** A goal further than this share of the current score is no motivation. */
export const GOAL_MAX_SHARE = 0.25;

/** The next round rank above `rank` (a smaller number), or `null` at #10 and above. */
export function nextRoundRank(rank: number): number | null {
  let next: number | null = null;
  for (const round of ROUND_RANKS) {
    if (round < rank) {
      next = round;
    }
  }
  return next;
}

export type GoalCandidate = Omit<RankGoal, 'needed'> & { needed: number | null };

/** Narrower lists win ties. */
const SCOPE_ORDER: Record<RankGoal['scope'], number> = { language: 0, country: 1, global: 2 };

/**
 * The goal a badge shows: the smallest gap among the candidates; none when nothing is needed (already there, or
 * #1) or when the gap is more than a quarter of the current score.
 */
export function chooseGoal(candidates: GoalCandidate[], score: number): RankGoal | null {
  const reachable = candidates.filter(
    (candidate): candidate is RankGoal =>
      candidate.needed !== null && candidate.needed > 0 && candidate.needed <= score * GOAL_MAX_SHARE,
  );
  reachable.sort((a, b) => a.needed - b.needed || SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope]);
  return reachable[0] ?? null;
}

/**
 * The goal as a collection, never a bare language: "top 25 Rust repos", "top 25,000 repos", "top 1,000 devs",
 * "top 100 Rust devs", "top 10 devs in Ukraine".
 */
export function goalText(goal: RankGoal, entity: 'repo' | 'user'): string {
  const top = `top ${formatFull(goal.targetRank)}`;
  const noun = entity === 'repo' ? 'repos' : 'devs';
  if (goal.scope === 'language' && goal.language) {
    return `${top} ${goal.language} ${noun}`;
  }
  if (goal.scope === 'country' && goal.country) {
    return `${top} ${noun} in ${goal.country}`;
  }
  return `${top} ${noun}`;
}

/** "8 ★", "120 contribution ★", "40 followers". */
export function goalAmount(goal: Pick<RankGoal, 'needed' | 'unit'>): string {
  const amount = formatFull(goal.needed);
  switch (goal.unit) {
    case 'contributionStars':
      return `${amount} contribution ★`;
    case 'followers':
      return `${amount} ${goal.needed === 1 ? 'follower' : 'followers'}`;
    default:
      return `${amount} ★`;
  }
}
