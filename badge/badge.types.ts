import z from 'zod';

import { BadgeV2ZodSchema } from './badge.zod';

export enum BadgeTemplateType {
  Small = 'small',
  Medium = 'medium',
}

export type BadgeV2Params = z.infer<typeof BadgeV2ZodSchema>;

export type DeltaSentimentType = 'positive' | 'negative';
export type BadgeServiceProps = {
  login: string;
  params: BadgeV2Params;
};
