import { MIN_RANK_SCORE } from '@/badge/badge.consts';
import type { UserRankProp } from '@/types/ranking.types';

export type RankingScores = Partial<Record<UserRankProp, number | null>>;

/** Global ranks; `null` when the profile has none at all. */
export type RankingRanks = Partial<Record<UserRankProp | `${UserRankProp}Provisional`, number | null>> | null;

/**
 * Mirrors the badge route: a profile is in a ranking from MIN_RANK_SCORE up, once it has a rank or a
 * provisional one there. Callers that do not have the ranks leave them out and check the score only.
 */
export const isRankedIn = (ranking: UserRankProp, scores: RankingScores, ranks?: RankingRanks): boolean => {
  if ((scores[ranking] ?? 0) < MIN_RANK_SCORE) {
    return false;
  }

  return ranks === undefined || !!(ranks?.[ranking] ?? ranks?.[`${ranking}Provisional`]);
};
