import type { FC } from 'react';

import { REPO_TIER_NAMES } from '@/app/app.consts';
import { RepoTierIcon } from '@/components/repo-tier-icon/repo-tier-icon';
import { tierChipClass } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';

// Literal class names so Tailwind generates them: tier text strong enough for 12px on its 15% fill.
const STRONG_TEXT_CLASSES = [
  'text-tier-1-strong',
  'text-tier-2-strong',
  'text-tier-3-strong',
  'text-tier-4-strong',
  'text-tier-5-strong',
  'text-tier-6-strong',
  'text-tier-7-strong',
];

/** "Supernova 5". */
export const repoTierLabel = (tier: Pick<Tier, 'tier' | 'level'>) => `${REPO_TIER_NAMES[tier.tier - 1]} ${tier.level}`;

/** A repository's tier as a chip: its glyph and name in the tier colour on a 15% fill. */
export const RepoTierChip: FC<{ tier: Pick<Tier, 'tier' | 'level'>; className?: string }> = ({ tier, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
      tierChipClass(tier.tier),
      STRONG_TEXT_CLASSES[tier.tier - 1],
      className,
    )}
  >
    <RepoTierIcon tier={tier.tier} className="size-3.5" />
    {repoTierLabel(tier)}
  </span>
);

/**
 * The tier as a badge on an owner avatar, bottom right (the repository cards' status badge): the small glyph on a
 * tinted disk, ringed in the colour of the surface it sits on. Its parent must be `relative`.
 */
export const RepoTierAvatarBadge: FC<{
  tier: Pick<Tier, 'tier' | 'level'>;
  /** `sm` for avatars of 24px and under. */
  size?: 'md' | 'sm';
  /** The surface behind the avatar: `background` on pages, `card` inside cards. */
  surface?: 'background' | 'card';
  className?: string;
}> = ({ tier, size = 'md', surface = 'card', className }) => (
  <span
    role="img"
    aria-label={repoTierLabel(tier)}
    title={repoTierLabel(tier)}
    className={cn(
      'absolute flex items-center justify-center rounded-full ring-2',
      surface === 'background' ? 'bg-background ring-background' : 'bg-card ring-card',
      size === 'sm' ? '-right-1.5 -bottom-1.5 size-4' : '-right-1.5 -bottom-1.5 size-5',
      STRONG_TEXT_CLASSES[tier.tier - 1],
      className,
    )}
  >
    <span className={cn('flex size-full items-center justify-center rounded-full', tierChipClass(tier.tier))}>
      <RepoTierIcon tier={tier.tier} className={size === 'sm' ? 'size-3' : 'size-3.5'} />
    </span>
  </span>
);
