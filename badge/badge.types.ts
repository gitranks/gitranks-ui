import z from 'zod';

import { Tier } from '@/types/generated/graphql';
import { RankingType } from '@/types/ranking.types';
import { ThemeType } from '@/types/theme.types';
import { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

import { BadgeV2ZodSchema } from './badge.zod';

export enum BadgeTemplateType {
  Small = 'small',
  Medium = 'medium',
}

export type DeltaSentimentType = 'positive' | 'negative';

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
