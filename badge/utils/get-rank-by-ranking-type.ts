import { RankByLoginQuery } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';

import { DeltaSentimentType } from '../badge.types';

type RankByTypeResult = { rank?: number; delta?: number; sentiment?: DeltaSentimentType; value?: number | null };

export const getRankByRankingType = (
  data: RankByLoginQuery['rankByLogin'],
  rankingType: RankingType,
): RankByTypeResult => {
  let rank;
  let monthlyRank;
  let value;

  if (!data) {
    return {};
  }

  switch (rankingType) {
    case RankingType.Star:
      rank = data.ownedStars || 0;
      monthlyRank = data.ownedStarsM;
      value = data.user?.ownedStars;
      break;
    case RankingType.Contribution:
      rank = data.contributedStars || 0;
      monthlyRank = data.contributedStarsM;
      value = data.user?.contributedStars;
      break;
    case RankingType.Follower:
      rank = data.followersCount || 0;
      monthlyRank = data.followersCountM;
      value = data.user?.followersCount;
      break;
  }

  const delta = monthlyRank && rank ? monthlyRank - rank : 0;

  return { rank, value, delta, sentiment: delta > 0 ? 'positive' : 'negative' };
};
