import type { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { TierIcon } from '@/components/tier-icon/tier-icon';
import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';

export const tierLabel = (tier: Pick<Tier, 'tier' | 'level'>) => `${TIER_NAMES[tier.tier - 1]} ${tier.level}`;

// Literal class names so Tailwind generates them.
const TIER_TEXT_CLASSES = [
  'text-tier-1',
  'text-tier-2',
  'text-tier-3',
  'text-tier-4',
  'text-tier-5',
  'text-tier-6',
  'text-tier-7',
];

// Text in the tier colour on a 15% fill of it.
const TIER_CHIP_CLASSES = [
  'bg-tier-1/15 text-tier-1',
  'bg-tier-2/15 text-tier-2',
  'bg-tier-3/15 text-tier-3',
  'bg-tier-4/15 text-tier-4',
  'bg-tier-5/15 text-tier-5',
  'bg-tier-6/15 text-tier-6',
  'bg-tier-7/15 text-tier-7',
];

// Literal class names so Tailwind generates them: tier text strong enough for 12px on a light fill of its colour.
const TIER_STRONG_TEXT_CLASSES = [
  'text-tier-1-strong',
  'text-tier-2-strong',
  'text-tier-3-strong',
  'text-tier-4-strong',
  'text-tier-5-strong',
  'text-tier-6-strong',
  'text-tier-7-strong',
];

/** The tier's text colour for small text on a tinted surface (a chip's fill, a tier-tinted card). */
export const tierStrongTextClass = (tier: number) => TIER_STRONG_TEXT_CLASSES[tier - 1];

/** The tier's chip classes: text in the tier colour on a 15% fill of it. */
export const tierChipClass = (tier: number) => TIER_CHIP_CLASSES[tier - 1];

/** The tier's text colour class, for a tier name written in it. */
export const tierTextClass = (tier?: number | null) => (tier ? TIER_TEXT_CLASSES[tier - 1] : undefined);

/** A developer's tier as a chip: its glyph and name in the tier colour on a 15% fill. */
export const TierChip: FC<{ tier: Pick<Tier, 'tier' | 'level'>; className?: string }> = ({ tier, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
      TIER_CHIP_CLASSES[tier.tier - 1],
      className,
    )}
  >
    <TierIcon tier={tier.tier} className="size-3.5" />
    {tierLabel(tier)}
  </span>
);

/**
 * A developer's tier as a badge on their avatar, bottom right: the glyph on a tinted disk, ringed in the colour of the
 * surface it sits on (`bg-card ring-card` by default; pass the surface's `bg-*` and `ring-*` for another). Decor: the
 * avatar's alt text names the tier. Its parent must be `relative`.
 */
export const TierAvatarBadge: FC<{ tier: number; className?: string }> = ({ tier, className }) => (
  <span
    aria-hidden
    className={cn(
      'absolute -right-1 -bottom-1 z-10 flex size-4 items-center justify-center rounded-full bg-card ring-2 ring-card',
      className,
    )}
  >
    <span className={cn('flex size-full items-center justify-center rounded-full', TIER_CHIP_CLASSES[tier - 1])}>
      <TierIcon tier={tier} className={cn('size-3', TIER_STRONG_TEXT_CLASSES[tier - 1])} />
    </span>
  </span>
);
