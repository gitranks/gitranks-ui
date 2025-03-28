import { FC } from 'react';
import { BadgeIconProps } from './badge-icon.types';
import { Follower, PullRequest, Star } from '../icons';
import { BadgeType } from '../../badge/badge.types';

const getIconByType = (type: BadgeType) => {
  switch (type) {
    case 'stars':
      return Star;
    case 'contributions':
      return PullRequest;
    case 'followers':
      return Follower;
  }
};

export const BadgeIcon: FC<BadgeIconProps> = ({ size, type }) => {
  const Icon = getIconByType(type);

  if (!Icon) {
    return null;
  }

  return <Icon width={size} height={size} />;
};
