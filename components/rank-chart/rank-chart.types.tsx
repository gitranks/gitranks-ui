import type { ReactNode } from 'react';

import type { Tier } from '@/types/generated/graphql';

export type Progress = {
  tier: number;
  level: number;
};

export type RankChartProps = {
  tiers?: Tier[] | null;
  progress?: Progress;
  colors?: string[];
  /** The tier names along the ring, worst to best: developers' by default, repositories' on repository pages. */
  labels?: readonly string[];
  /** Shown in the ring's middle (a repository tier's glyph). */
  children?: ReactNode;
  debug?: boolean;
};

export type ChartItemType = {
  value: number;
  tier: number;
  level: number;
  isGap: boolean;
};
