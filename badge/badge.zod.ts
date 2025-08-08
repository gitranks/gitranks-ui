import { z } from 'zod';

import { RankContext, RankMeta, RankType } from '@/types/badge.types';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

import { USER_RANK_PROPS } from './badge.consts';
import { BadgeTemplateType } from './badge.types';

export const BadgeZodSchema = z.object({
  rankingType: z.enum(RankingType).default(RankingType.Star),
  template: z.enum(BadgeTemplateType).default(BadgeTemplateType.Medium),
  theme: z.enum(ThemeType).default(ThemeType.Light),
});

export const BadgeV2ZodSchema = z.object({
  ranking: z.enum(USER_RANK_PROPS).default('s'),
  context: z.enum(RankContext).default(RankContext.Global),
  type: z.enum(RankType).default(RankType.Position),
  meta: z.enum(RankMeta).default(RankMeta.None),
  label: z.string().optional(),
  leftColor: z
    .string()
    .regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i)
    .optional(),
  rightColor: z
    .string()
    .regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i)
    .optional(),
});
