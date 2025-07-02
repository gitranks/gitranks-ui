import { Tier } from '@/types/generated/graphql';

export type Progress = {
  tier: number;
  level: number;
};

export type RankChartProps = {
  tiers?: Tier[] | null;
  progress?: Progress;
  colors?: string[];
  debug?: boolean;
};

export type ChartItemType = {
  value: number;
  tier: number;
  level: number;
  isGap: boolean;
};
