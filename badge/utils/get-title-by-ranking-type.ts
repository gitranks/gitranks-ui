import { RANK_NAME } from '../badge.consts';
import { RankingType } from '@/types/ranking.types';

export const getTitleByRankingType = (rankingType: RankingType) => {
  switch (rankingType) {
    case RankingType.Star:
      return RANK_NAME.s;
    case RankingType.Contribution:
      return RANK_NAME.c;
    case RankingType.Follower:
      return RANK_NAME.f;
  }
};
