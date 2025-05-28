import { RankingType } from '@/types/ranking.types';

export function getBestRankType(params: {
  ownedStars?: number | null;
  contributedStars?: number | null;
  followersCount?: number | null;
}): RankingType {
  const { ownedStars, contributedStars, followersCount } = params;

  if (
    (ownedStars || Infinity) < (contributedStars || Infinity) &&
    (ownedStars || Infinity) < (followersCount || Infinity)
  ) {
    return RankingType.Star;
  }

  if ((contributedStars || Infinity) < (followersCount || Infinity)) {
    return RankingType.Contribution;
  }

  return RankingType.Follower;
}
