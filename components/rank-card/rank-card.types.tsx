import type { FC, ReactNode } from 'react';

import type { StarsNotCountedTotal } from '@/components/star-count/star-count';
import type { Tier, UserLanguage } from '@/types/generated/graphql';
import type { UserRankProp } from '@/types/ranking.types';
import type { ProfileTierType } from '@/utils/calculate-tiers/calculate-tiers.types';

export type RankCardProps = {
  tiers?: Tier[];
  tierData: ProfileTierType;
  rankType: UserRankProp;
  rank?: number | null;
  rankM?: number | null;
  rankProvisional?: number | null;
  score?: number | null;
  /** The stars ranking's total: the stars that don't count, struck through before it. */
  starsNotCounted?: StarsNotCountedTotal | null;
  login: string;
  rankingName: string;
  rankingLink: string;
};

export type LanguageRankCardProps = {
  language: UserLanguage;
  country?: string | null;
  isGlobalContext?: boolean;
};

export type RankCardItemProps = {
  Icon?: FC<{ size: number; className?: string }>;
  children: ReactNode;
  className?: string;
};

export type RankCardPositionProps = {
  rank?: number | null;
  rankedCount?: number;
  rankingLink: string;
};

export type RankCardTotalProfilesRankedProps = { rankedCount?: number; rankingLink: string };

export type RankCardTotalValueProps = {
  score?: number | null;
  /** For the stars total: the stars that don't count, struck through before it. */
  starsNotCounted?: StarsNotCountedTotal | null;
  rankType: UserRankProp;
  login: string;
  showLink?: boolean;
};

export type NextTierThresholdProps = {
  tiers?: Tier[];
  tierData: ProfileTierType;
  rankType: UserRankProp;
  score?: number | null;
};
