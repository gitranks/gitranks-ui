import Image from 'next/image';
import type { FC } from 'react';

import { TierAvatarBadge } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';

// Literal class names so Tailwind generates them: the developer tier colours (tier-1 … tier-7).
export const TIER_BG = ['bg-tier-1', 'bg-tier-2', 'bg-tier-3', 'bg-tier-4', 'bg-tier-5', 'bg-tier-6', 'bg-tier-7'];
const TIER_RING = [
  'ring-tier-1',
  'ring-tier-2',
  'ring-tier-3',
  'ring-tier-4',
  'ring-tier-5',
  'ring-tier-6',
  'ring-tier-7',
];

const SIZES = { sm: { px: 32, className: 'size-8' }, md: { px: 36, className: 'size-9' } } as const;

/**
 * A developer's avatar ringed in their tier colour, the ring set off from the surface by a gap of its colour
 * (`ring-offset-card` by default; pass another `ring-offset-*` for a tinted surface), with the tier's glyph as a badge
 * on its bottom-right corner. A grey disk without a picture.
 */
export const TierAvatar: FC<{
  url?: string | null;
  /** The alt text: the login and the tier; empty when the name is written next to it (the avatar is decor then). */
  label: string;
  tier: number;
  size?: keyof typeof SIZES;
  className?: string;
  /** The tier badge; leave it off where the tier is written next to the avatar with its glyph. */
  badge?: boolean;
  /** The badge's surface, `bg-*` and `ring-*`, when the avatar is not on a card. */
  badgeClassName?: string;
}> = ({ url, label, tier, size = 'sm', className, badge = true, badgeClassName }) => {
  const { px, className: sizeClass } = SIZES[size];
  const classes = cn(
    'block shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card',
    sizeClass,
    TIER_RING[tier - 1],
    className,
  );

  const avatar = url ? (
    <Image
      src={`${url}${url.includes('?') ? '&' : '?'}s=${px * 2}`}
      alt={label}
      width={px}
      height={px}
      className={classes}
    />
  ) : label ? (
    <span role="img" aria-label={label} className={cn('bg-muted', classes)} />
  ) : (
    <span aria-hidden className={cn('bg-muted', classes)} />
  );

  return badge ? (
    <span className="relative block shrink-0">
      {avatar}
      <TierAvatarBadge tier={tier} className={badgeClassName} />
    </span>
  ) : (
    avatar
  );
};
