import type { BadgeCornerStyle } from '@/types/badge.types';

export type BadgeInlineProps = {
  label?: string;
  value?: string;
  /** A developer tier (1–7) whose glyph leads the value, in the value's text colour. */
  valueTier?: number;
  meta?: string;
  cornerStyle?: BadgeCornerStyle;
  labelBgColor?: string;
  valueBgColor?: string;
};
