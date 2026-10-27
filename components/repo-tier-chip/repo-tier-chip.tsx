import type { FC } from 'react';

import { REPO_TIER_NAMES } from '@/app/app.consts';
import { RepoTierIcon } from '@/components/repo-tier-icon/repo-tier-icon';
import { tierChipClass, tierTextClass } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';

/** "Supernova 5". */
export const repoTierLabel = (tier: Pick<Tier, 'tier' | 'level'>) => `${REPO_TIER_NAMES[tier.tier - 1]} ${tier.level}`;

/** A repository's tier as a chip: its glyph and name in the tier colour on a 15% fill. */
export const RepoTierChip: FC<{ tier: Pick<Tier, 'tier' | 'level'>; className?: string }> = ({ tier, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
      tierChipClass(tier.tier),
      className,
    )}
  >
    <RepoTierIcon tier={tier.tier} className="size-3.5" />
    {repoTierLabel(tier)}
  </span>
);

/**
 * The tier as a badge on an owner avatar, bottom right (the repository cards' status badge): the small glyph on a
 * tinted disk ringed in the card colour. Its parent must be `relative`.
 */
export const RepoTierAvatarBadge: FC<{
  tier: Pick<Tier, 'tier' | 'level'>;
  /** `sm` for avatars of 24px and under. */
  size?: 'md' | 'sm';
  className?: string;
}> = ({ tier, size = 'md', className }) => (
  <span
    title={repoTierLabel(tier)}
    className={cn(
      'absolute flex items-center justify-center rounded-full bg-card ring-2 ring-card',
      size === 'sm' ? '-right-1.5 -bottom-1.5 size-3.5' : '-right-1 -bottom-1 size-[18px]',
      tierTextClass(tier.tier),
      className,
    )}
  >
    <span className={cn('flex size-full items-center justify-center rounded-full', tierChipClass(tier.tier))}>
      <RepoTierIcon tier={tier.tier} className={size === 'sm' ? 'size-2.5' : 'size-3'} labelled />
    </span>
  </span>
);
