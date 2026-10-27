import type { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
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

/** The tier's chip classes: text in the tier colour on a 15% fill of it. */
export const tierChipClass = (tier: number) => TIER_CHIP_CLASSES[tier - 1];

/** The tier's text colour class, for a tier name written in it. */
export const tierTextClass = (tier?: number | null) => (tier ? TIER_TEXT_CLASSES[tier - 1] : undefined);

export const TierChip: FC<{ tier: Pick<Tier, 'tier' | 'level'>; className?: string }> = ({ tier, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-semibold before:size-1.5 before:rounded-full before:bg-current',
      TIER_CHIP_CLASSES[tier.tier - 1],
      className,
    )}
  >
    {tierLabel(tier)}
  </span>
);
