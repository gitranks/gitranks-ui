import { z } from 'zod';

import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

import { BadgeTemplateType } from './badge.types';

export const BadgeZodSchema = z.object({
  rankingType: z.nativeEnum(RankingType).default(RankingType.Star),
  template: z.nativeEnum(BadgeTemplateType).default(BadgeTemplateType.Medium),
  theme: z.nativeEnum(ThemeType).default(ThemeType.Light),
});
