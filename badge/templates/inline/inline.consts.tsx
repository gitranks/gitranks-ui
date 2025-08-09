import { RankMeta, RankType } from '@/types/badge.types';

export const INLINE_BADGE_HEIGHT = 20;
export const BORDER_RADIUS = 3;
export const FONT_SIZE = 12;
export const FONT_SCALE = 0.93;
export const BOX_SHADOW = '0 1px 0 rgba(0, 0, 0, 0.3)';

export const PADDING_EDGE = 6;
export const PADDING_SIDE = 4;

export const TOP_PERCENTILE_TIER_IDX = {
  [RankMeta.GoalTop1]: { index: 4, label: 'top 1%' },
  [RankMeta.GoalTop10]: { index: 17, label: 'top 10%' },
  [RankMeta.GoalTop25]: { index: 29, label: 'top 25%' },
};

export const BADGE_TYPES_TO_LOAD_TIERS = [RankType.Percentile, RankType.Tier];

export const BADGE_META_TO_LOAD_TIERS = [
  RankMeta.Percentile,
  RankMeta.GoalNextTier,
  RankMeta.GoalTop1,
  RankMeta.GoalTop10,
  RankMeta.GoalTop25,
];
