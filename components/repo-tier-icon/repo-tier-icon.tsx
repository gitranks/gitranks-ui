'use client';

import { type FC, useId } from 'react';

import { repoTierLargeShapes, repoTierSmallShapes } from './repo-tier-shapes';
import { REPO_TIER_NAMES } from '@/app/app.consts';
import { cn } from '@/lib/utils';

type RepoTierIconProps = {
  /** 1 (Stardust) to 7 (Supernova). */
  tier: number;
  /** `large` (48 grid) for the rank card; `small` (24 grid, fewer parts) from 32px down to 14px. */
  variant?: 'large' | 'small';
  className?: string;
  /** Names the tier for screen readers; leave it off when the tier name is written next to the icon. */
  labelled?: boolean;
};

/** The glyph of a repository tier, drawn in `currentColor`: dust, comet, moon, planet, nova, galaxy, supernova. */
export const RepoTierIcon: FC<RepoTierIconProps> = ({ tier, variant = 'small', className, labelled = false }) => {
  const id = useId();
  const large = variant === 'large';
  const viewBox = large ? '0 0 48 48' : '0 0 24 24';
  const glyph = large ? repoTierLargeShapes(tier, id) : repoTierSmallShapes(tier, id);

  return labelled ? (
    <svg viewBox={viewBox} fill="currentColor" className={cn('shrink-0', className)} role="img">
      <title>{REPO_TIER_NAMES[tier - 1]}</title>
      {glyph}
    </svg>
  ) : (
    <svg viewBox={viewBox} fill="currentColor" className={cn('shrink-0', className)} aria-hidden="true">
      {glyph}
    </svg>
  );
};
