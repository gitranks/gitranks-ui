import { FC, ReactNode } from 'react';

import { ProfileTierType } from '@/app/profile/[login]/utils/calculate-tiers/calculate-tiers.types';
import { Tier } from '@/types/generated/graphql';
import { UserRankProps } from '@/types/ranking.types';

export type RankCardProps = {
  tiers?: Tier[];
  tierData: ProfileTierType;
  rankType: UserRankProps;
  rank?: number | null;
  rankM?: number | null;
  rankProvisional?: number | null;
  score?: number | null;
  login: string;
};

export type RankCardItemProps = {
  Icon?: FC<{ size: number; className?: string }>;
  children: ReactNode;
  className?: string;
};
export type RankCardPositionProps = {
  rank?: number | null;
  rankedCount?: number;
};
export type RankCardTotalValueProps = {
  score?: number | null;
  rankType: UserRankProps;
  login: string;
};
