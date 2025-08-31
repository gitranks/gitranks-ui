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

export const getTypeByRankProp = (rankProp: UserRankProp): RankingTypeClient => {
  switch (rankProp) {
    case UserRankProp.f:
      return RankingTypeClient.Follower;
    case UserRankProp.c:
      return RankingTypeClient.Contribution;
    case UserRankProp.s:
    default:
      return RankingTypeClient.Star;
  }
};
