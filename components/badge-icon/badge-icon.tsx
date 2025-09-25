import type { FC } from 'react';

import { RankingType } from '@/types/ranking.types';
import { Follower, PullRequest, Star } from '../icons';
import type { BadgeIconProps } from './badge-icon.types';

const getIconByRankingType = (rankingType: RankingType) => {
  switch (rankingType) {
    case RankingType.Star:
      return Star;
    case RankingType.Contribution:
      return PullRequest;
    case RankingType.Follower:
      return Follower;
  }
};

export const BadgeIcon: FC<BadgeIconProps> = ({ size, rankingType }) => {
  const Icon = getIconByRankingType(rankingType);

  if (!Icon) {
    return null;
  }

  return <Icon width={size} height={size} />;
};
