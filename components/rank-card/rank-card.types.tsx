import { FC, ReactNode } from 'react';

import { Tier } from '@/types/generated/graphql';
import { UserRankProps } from '@/types/ranking.types';
import { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

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
