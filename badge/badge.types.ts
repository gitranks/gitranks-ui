import type z from 'zod';

import type { Tier } from '@/types/generated/graphql';
import type { RankingType } from '@/types/ranking.types';
import type { ThemeType } from '@/types/theme.types';
import type { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

import type { BadgeV2ZodSchema } from './badge.zod';

/**
 * @deprecated This enum will be removed in a future version
 */
export enum BadgeTemplateType {
  Small = 'small',
  Medium = 'medium',
}

/**
 * @deprecated This type will be removed in a future version
 */
export type DeltaSentimentType = 'positive' | 'negative';

/**
 * @deprecated This type will be removed in a future version
 */
export type BadgeServiceProps = {
  theme: ThemeType;
  login: string;
  rankingType: RankingType;
};

export type BadgeV2Params = z.infer<typeof BadgeV2ZodSchema>;

export type BadgeV2ServiceProps = {
  login: string;
  params: BadgeV2Params;
};

export type BadgeFetchedData = {
  position: number;
  score: number;
  positionM?: number | null;
  scoreM?: number;
  tiers?: Tier[];
  tierData?: ProfileTierType;
  country?: string | null;
};
