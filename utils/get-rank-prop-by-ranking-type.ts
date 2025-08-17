import { RankingTypeClient, UserRankProp } from '@/types/ranking.types';

export const getRankPropByType = (rankingType: RankingTypeClient): UserRankProp => {
  switch (rankingType) {
    case RankingTypeClient.Follower:
      return UserRankProp.f;
    case RankingTypeClient.Contribution:
      return UserRankProp.c;
    case RankingTypeClient.Star:
    default:
      return UserRankProp.s;
  }
};
