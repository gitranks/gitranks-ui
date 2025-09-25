import type { BadgeCornerStyle } from '@/types/badge.types';

export type BadgeInlineProps = {
  label?: string;
  value?: string;
  meta?: string;
  cornerStyle?: BadgeCornerStyle;
  labelBgColor?: string;
  valueBgColor?: string;
};
