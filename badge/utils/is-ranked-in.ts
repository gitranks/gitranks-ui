import { MIN_RANK_SCORE } from '@/badge/badge.consts';
import { BadgeContext } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

export type RankingScores = Partial<Record<UserRankProp, number | null>>;

/** Global or country ranks; `null` when the profile has none at all. */
export type RankingRanks = Partial<Record<UserRankProp | `${UserRankProp}Provisional`, number | null>> | null;

/** Rankings a profile is in, per badge context. */
export type RankedIn = Record<BadgeContext, UserRankProp[]>;

/**
 * Mirrors the badge route: a profile is in a ranking from MIN_RANK_SCORE up, once it has a rank or a
 * provisional one there. Pass `undefined` ranks only where they are not known: then only the score is
 * checked.
 */
export const isRankedIn = (ranking: UserRankProp, scores: RankingScores, ranks: RankingRanks | undefined): boolean => {
  if ((scores[ranking] ?? 0) < MIN_RANK_SCORE) {
    return false;
  }

  return ranks === undefined || !!(ranks?.[ranking] ?? ranks?.[`${ranking}Provisional`]);
};

/** Rankings a profile is in, globally and in its country; a country badge also needs a country. */
export const getRankedIn = (
  profile: RankingScores & { country?: string | null },
  globalRanks: RankingRanks,
  countryRanks: RankingRanks,
): RankedIn => {
  const rankings = Object.values(UserRankProp);

  return {
    [BadgeContext.Global]: rankings.filter((ranking) => isRankedIn(ranking, profile, globalRanks)),
    [BadgeContext.Country]: profile.country
      ? rankings.filter((ranking) => isRankedIn(ranking, profile, countryRanks))
      : [],
  };
};
