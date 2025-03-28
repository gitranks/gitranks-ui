import { RankByLoginQuery } from '@/types/generated/graphql';
import { BadgeType, ThemeType } from '../../badge.types';

export type BadgeMediumProps = {
  type: BadgeType;
  theme: ThemeType;
  data: RankByLoginQuery['rankByLogin'];
};
