import { RANK_NAME } from '@/badge/badge.consts';
import { BadgeType } from '@/types/badge.types';
import { UserRankProp } from '@/types/ranking.types';

/** The label a badge gets until one is typed in: it follows the ranking and the type. */
export const getDefaultLabel = (ranking?: UserRankProp, type?: BadgeType): string => {
  if (type === BadgeType.Score) {
    switch (ranking) {
      case UserRankProp.s:
        return 'Total Stars';
      case UserRankProp.c:
        return 'Contribution Score';
      case UserRankProp.f:
        return 'Total Followers';
    }
  }

  return RANK_NAME[ranking ?? UserRankProp.s];
};
