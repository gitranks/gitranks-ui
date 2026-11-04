import type { FC } from 'react';

import { REPO_TIER_NAMES } from '@/app/app.consts';
import { RepoTierIcon } from '@/components/repo-tier-icon/repo-tier-icon';
import { tierChipClass, tierStrongTextClass } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';

/** "Supernova 5". */
export const repoTierLabel = (tier: Pick<Tier, 'tier' | 'level'>) => `${REPO_TIER_NAMES[tier.tier - 1]} ${tier.level}`;

/**
 * A repository's tier as a chip: its glyph and name in the tier colour on a 15% fill. `iconOnly` drops the name, which
 * stays in the tooltip and for screen readers.
 */
export const RepoTierChip: FC<{ tier: Pick<Tier, 'tier' | 'level'>; iconOnly?: boolean; className?: string }> = ({
  tier,
  iconOnly = false,
  className,
}) => (
  <span
    {...(iconOnly && { role: 'img', 'aria-label': repoTierLabel(tier), title: repoTierLabel(tier) })}
    className={cn(
      'inline-flex items-center gap-1 rounded-sm text-xs font-semibold whitespace-nowrap',
      iconOnly ? 'p-1' : 'px-2 py-0.5',
      tierChipClass(tier.tier),
      tierStrongTextClass(tier.tier),
      className,
    )}
  >
    <RepoTierIcon tier={tier.tier} className="size-3.5" />
    {!iconOnly && repoTierLabel(tier)}
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
      tierStrongTextClass(tier.tier),
      className,
    )}
  >
    <span className={cn('flex size-full items-center justify-center rounded-full', tierChipClass(tier.tier))}>
      <RepoTierIcon tier={tier.tier} className={size === 'sm' ? 'size-3' : 'size-3.5'} />
    </span>
  </span>
);
