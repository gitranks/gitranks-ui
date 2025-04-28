'use client';

import { parseAsStringEnum } from 'nuqs';

import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

import { BadgeTemplateType } from './badge.types';

export const BadgeNuqsSchema = {
  rankingType: parseAsStringEnum<RankingType>(Object.values(RankingType)).withDefault(RankingType.Star),
  template: parseAsStringEnum<BadgeTemplateType>(Object.values(BadgeTemplateType)).withDefault(
    BadgeTemplateType.Medium,
  ),
  theme: parseAsStringEnum<ThemeType>(Object.values(ThemeType)).withDefault(ThemeType.Light),
};
