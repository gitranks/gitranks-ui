import { BadgeMeta, BadgeType } from '@/types/badge.types';

export const INLINE_BADGE_HEIGHT = 20;
export const BORDER_RADIUS = 3;
export const FONT_SIZE = 12;
export const FONT_SCALE = 0.93;
export const META_SCALE = 0.85;

export const LABEL_BG = '#5c5c5c';
export const VALUE_BG = '#2282c2';

export const PADDING_EDGE = 6;
export const PADDING_SIDE = 6;

export const TOP_PERCENTILE_TIER_IDX = {
  [BadgeMeta.GoalTop1]: { index: 4, label: 'top 1%' },
  [BadgeMeta.GoalTop10]: { index: 17, label: 'top 10%' },
  [BadgeMeta.GoalTop25]: { index: 29, label: 'top 25%' },
};

export const BADGE_TYPES_TO_LOAD_TIERS = [BadgeType.Percentile, BadgeType.Tier, BadgeType.Score];

export const BADGE_META_TO_LOAD_TIERS = [
  BadgeMeta.Percentile,
  BadgeMeta.GoalNextTier,
  BadgeMeta.GoalTop1,
  BadgeMeta.GoalTop10,
  BadgeMeta.GoalTop25,
];
