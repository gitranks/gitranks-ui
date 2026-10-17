import { MIN_RANK_SCORE } from '@/badge/badge.consts';
import type { UserRankProp } from '@/types/ranking.types';

export type RankingScores = Partial<Record<UserRankProp, number | null>>;

/** Below MIN_RANK_SCORE a profile is not in that ranking, so every badge for it is an error. */
export const isRankedIn = (ranking: UserRankProp, scores: RankingScores): boolean =>
  (scores[ranking] ?? 0) >= MIN_RANK_SCORE;
