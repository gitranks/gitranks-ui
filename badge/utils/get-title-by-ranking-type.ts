import { RankingType } from '@/types/ranking.types';

export const getTitleByRankingType = (rankingType: RankingType) => {
  switch (rankingType) {
    case RankingType.Star:
      return 'Stars Rank';
    case RankingType.Contribution:
      return 'Contributions Rank';
    case RankingType.Follower:
      return 'Followers Rank';
  }
};
