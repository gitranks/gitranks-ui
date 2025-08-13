import { z } from 'zod';

import { BadgeCornerStyle, BadgeContext, BadgeMeta, BadgeType, BadgeRanking } from '@/types/badge.types';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';

import { BadgeTemplateType } from './badge.types';

export const BadgeZodSchema = z.object({
  rankingType: z.enum(RankingType).default(RankingType.Star),
  template: z.enum(BadgeTemplateType).default(BadgeTemplateType.Medium),
  theme: z.enum(ThemeType).default(ThemeType.Light),
});

export const BadgeV2ZodSchema = z.object({
  ranking: z.enum(BadgeRanking).default(BadgeRanking.s),
  context: z.enum(BadgeContext).default(BadgeContext.Global),
  type: z.enum(BadgeType).default(BadgeType.Position),
  meta: z.enum(BadgeMeta).default(BadgeMeta.None),
  label: z.string().optional(),
  cornerStyle: z.enum(BadgeCornerStyle).default(BadgeCornerStyle.Rounded),
  labelBgColor: z
    .string()
    .regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i)
    .optional(),
  valueBgColor: z
    .string()
    .regex(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i)
    .optional(),
});
