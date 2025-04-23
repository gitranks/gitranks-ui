import { RankByLoginQuery } from '@/types/generated/graphql';

import { BadgeType, DeltaSentimentType } from '../badge.types';

type RankByTypeResult = { rank?: number; delta?: number; sentiment?: DeltaSentimentType; value?: number | null };

export const getRankByType = (data: RankByLoginQuery['rankByLogin'], type: BadgeType): RankByTypeResult => {
  let rank;
  let monthlyRank;
  let value;

  if (!data) {
    return {};
  }

  switch (type) {
    case 'stars':
      rank = data.ownedStars;
      monthlyRank = data.ownedStarsM;
      value = data.user?.ownedStars;
      break;
    case 'contributions':
      rank = data.contributedStars;
      monthlyRank = data.contributedStarsM;
      value = data.user?.contributedStars;
      break;
    case 'followers':
      rank = data.followersCount;
      monthlyRank = data.followersCountM;
      value = data.user?.followersCount;
      break;
  }

  const delta = (monthlyRank ?? rank) - rank;

  return { rank, value, delta, sentiment: delta > 0 ? 'positive' : 'negative' };
};
