import { BadgeType } from '../badge.types';

export const getTitleByType = (type: BadgeType) => {
  switch (type) {
    case 'stars':
      return 'Stars Rank';
    case 'contributions':
      return 'Contributor Rank';
    case 'followers':
      return 'Followers Rank';
  }
};
