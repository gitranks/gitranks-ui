import { TIER_NAMES } from '@/app/app.consts';

export const DEFAULT_COLORS = ['#3B8EEA', '#00A8E8', '#00C5D7', '#30D594', '#B6E36B', '#FFD24C', '#FF8B48'];
// light = ['#3B8EEA','#00A8E8','#00C5D7','#30D594','#B6E36B','#FFD24C','#FF8B48'];
// dark = ['#2C7BB6','#0095C9','#00B3C7','#00CFA3','#8DD84C','#F9C445','#FF8132'];

export const TIERS_COUNT = TIER_NAMES.length;
export const START_END_GAP = 14; // degrees
export const LEVELS_PER_TIER = 5;
export const GAP_BETWEEN_TIERS = 2; // degrees
export const SUB_ANGLE = (360 - TIERS_COUNT * GAP_BETWEEN_TIERS - START_END_GAP) / (TIERS_COUNT * LEVELS_PER_TIER);
export const GAP_VALUE = GAP_BETWEEN_TIERS / SUB_ANGLE;
export const WEDGE_DEG = (360 - TIERS_COUNT * GAP_BETWEEN_TIERS - START_END_GAP) / TIERS_COUNT;
export const FONT_SIZE = 12; // default font size for labels
export const LABEL_OFFSET = 8;
export const DIM_OPACITY = 0.2;
export const RADIUS = 60; // outer radius of the pie chart
export const INNER_RADIUS = 45; // inner radius of the pie chart
export const LABEL_RADIUS = RADIUS + LABEL_OFFSET; // radius for label positioning
export const CANVAS_MID = LABEL_RADIUS + FONT_SIZE * 1.5; // size of the canvas for the chart
export const CANVAS_SIZE = CANVAS_MID * 2;

export const ANIMATION_DELAY = 100; // ms
