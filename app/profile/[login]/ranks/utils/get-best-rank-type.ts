import { RankingType } from '@/types/ranking.types';

export function getBestRankType(params: {
  ownedStars?: number;
  contributedStars?: number;
  followersCount?: number;
}): RankingType {
  const { ownedStars = Infinity, contributedStars = Infinity, followersCount = Infinity } = params;

  if (ownedStars < contributedStars && ownedStars < followersCount) {
    return RankingType.Star;
  }

  if (contributedStars < followersCount) {
    return RankingType.Contribution;
  }

  return RankingType.Follower;
}
