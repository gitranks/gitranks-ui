import { RankOrder } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';

export const getRankingConfigByType = (rankingType: string) => {
  switch (rankingType) {
    case RankingTypeClient.Contribution:
      return ['c', 'Stars'] as const;
    case RankingTypeClient.Follower:
      return ['f', 'Followers'] as const;
    case RankingTypeClient.Star:
    default:
      return ['s', 'Stars'] as const;
  }
};

export const getRankingOrder = (rankingType: string) => {
  switch (rankingType) {
    case RankingTypeClient.Contribution:
      return RankOrder.Contributions;
    case RankingTypeClient.Follower:
      return RankOrder.Followers;
    case RankingTypeClient.Star:
    default:
      return RankOrder.Stars;
  }
};
