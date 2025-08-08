import { ProfileTierType } from '@/app/profile/[login]/utils/calculate-tiers/calculate-tiers.types';
import { Tier } from '@/types/generated/graphql';

export type BadgeInlineProps = {
  label?: string;
  value?: string;
  meta?: string;
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
