import { UserRankProp } from '@/types/ranking.types';

export const GITHUB_TOTAL_USERS = 100_000_000;

export const RANK_NAME = {
  [UserRankProp.s]: 'Stars Rank',
  [UserRankProp.c]: 'Contributor Rank',
  [UserRankProp.f]: 'Followers Rank',
  u: 'Users Rank',
  o: 'Organizations Rank',
};
