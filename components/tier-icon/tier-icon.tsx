import type { FC, ReactElement } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { cn } from '@/lib/utils';

type TierIconProps = {
  /** 1 (Rookie) to 7 (Legend). */
  tier: number;
  className?: string;
  /** Names the tier for screen readers; leave it off when the tier name is written next to the icon. */
  labelled?: boolean;
};

const chevrons = (d: string, strokeWidth = 5) => (
  <path
    key="chevrons"
    d={d}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/**
 * The parts of a developer tier's glyph on a 48 grid, all in `currentColor`: one to three chevrons, three chevrons
 * over a bar, a star, two stars, a crown. A flat list of plain SVG elements, so the badge renderer can draw it too.
 */
export const tierIconShapes = (tier: number): ReactElement[] => {
  switch (tier) {
    case 1:
      return [chevrons('M10 28L24 20L38 28')];
    case 2:
      return [chevrons('M10 22L24 14L38 22M10 33L24 25L38 33')];
    case 3:
      return [chevrons('M10 17L24 9L38 17M10 27L24 19L38 27M10 37L24 29L38 37')];
    case 4:
      return [
        chevrons('M10 13L24 5L38 13M10 22L24 14L38 22M10 31L24 23L38 31', 4.6),
        <path
          key="arc"
          d="M9 36.5Q24 46 39 36.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.6"
          strokeLinecap="round"
        />,
      ];
    case 5:
      return [
        <path
          key="star"
          d="M24.00 11.50 L27.41 20.81 L37.31 21.17 L29.52 27.29 L32.23 36.83 L24.00 31.30 L15.77 36.83 L18.48 27.29 L10.69 21.17 L20.59 20.81Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />,
      ];
    case 6:
      return [
        <path
          key="stars"
          d="M13.50 17.00 L15.73 22.93 L22.06 23.22 L17.11 27.17 L18.79 33.28 L13.50 29.80 L8.21 33.28 L9.89 27.17 L4.94 23.22 L11.27 22.93Z M34.50 17.00 L36.73 22.93 L43.06 23.22 L38.11 27.17 L39.79 33.28 L34.50 29.80 L29.21 33.28 L30.89 27.17 L25.94 23.22 L32.27 22.93Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />,
      ];
    default:
      return [
        <path
          key="crown"
          d="M7 35L10 16L18.5 25L24 11L29.5 25L38 16L41 35Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />,
        <rect key="band" x="7" y="37.5" width="34" height="4.5" rx="2.2" fill="currentColor" />,
        <circle key="left" cx="10" cy="14.5" r="2.8" fill="currentColor" />,
        <circle key="middle" cx="24" cy="9.5" r="2.8" fill="currentColor" />,
        <circle key="right" cx="38" cy="14.5" r="2.8" fill="currentColor" />,
      ];
  }
};

/** The glyph of a developer tier, drawn in `currentColor`; the same glyph from 12px up. */
export const TierIcon: FC<TierIconProps> = ({ tier, className, labelled = false }) =>
  labelled ? (
    <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} role="img">
      <title>{TIER_NAMES[tier - 1]}</title>
      {tierIconShapes(tier)}
    </svg>
  ) : (
    <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden="true">
      {tierIconShapes(tier)}
    </svg>
  );
