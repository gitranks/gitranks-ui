import type { ReactElement } from 'react';

import type { MarkColors } from './schemes';
import type { SegmentIcon } from './types';
import { MARK_STAR_PATH } from '@/components/logo/logo.consts';
import { repoTierLargeShapes, repoTierSmallShapes } from '@/components/repo-tier-icon/repo-tier-shapes';
import { tierIconShapes } from '@/components/tier-icon/tier-icon';

/** The podium mark in its two colours, as the site's logo draws it. */
export function Mark({ size, colors }: Readonly<{ size: number; colors: MarkColors }>): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }} aria-hidden="true">
      <rect x="5" y="27" width="11.5" height="16" rx="2.2" fill={colors.podium} fillOpacity=".55" />
      <rect x="18.25" y="21" width="11.5" height="22" rx="2.2" fill={colors.podium} />
      <rect x="31.5" y="31" width="11.5" height="12" rx="2.2" fill={colors.podium} fillOpacity=".35" />
      <path d={MARK_STAR_PATH} fill={colors.star} stroke={colors.star} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A tier glyph in one colour: a developer tier's insignia (48 grid) or a repository tier's Cosmic glyph (the small
 * one on a 24 grid, or the large one for the tier card). satori draws an inline SVG as an image of its own, so the
 * glyph's mask ids stay inside it.
 */
export function TierGlyph({
  icon,
  size,
  color,
  large = false,
}: Readonly<{ icon: SegmentIcon; size: number; color: string; large?: boolean }>): ReactElement {
  if (icon.kind === 'user-tier') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        color={color}
        style={{ flexShrink: 0, color }}
        aria-hidden="true"
      >
        {tierIconShapes(icon.tier)}
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={large ? '0 0 48 48' : '0 0 24 24'}
      fill={color}
      color={color}
      style={{ flexShrink: 0, color }}
      aria-hidden="true"
    >
      {large ? repoTierLargeShapes(icon.tier, 'g') : repoTierSmallShapes(icon.tier, 'g')}
    </svg>
  );
}
