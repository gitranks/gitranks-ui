import { RankByLoginQuery } from '@/types/generated/graphql';
import { BadgeType, ThemeType } from '../../badge.types';

export type BadgeSmallProps = {
  type: BadgeType;
  theme: ThemeType;
  data: RankByLoginQuery['rankByLogin'];
};
