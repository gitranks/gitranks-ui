import Image from 'next/image';
import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { Tier } from '@/types/generated/graphql';

/** The tier whose rank range holds `position`, from the cut-offs of one ranking. */
export const tierAt = (tiers: readonly Tier[] | null | undefined, position?: number | null): Tier | null => {
  if (!tiers?.length || !position) {
    return null;
  }

  return tiers.find((t) => position >= t.minRank && position <= t.maxRank) ?? null;
};

/**
 * A GitHub avatar loaded straight from GitHub's image CDN at twice its display size. The landing
 * shows the same avatars to every visitor, so sending them through our image optimizer would cost a
 * request to our server per avatar per new visitor.
 */
/** The avatar URL asking GitHub for `px` pixels; null when it is missing or not an absolute URL. */
const sizedAvatarUrl = (url: string | null | undefined, px: number) => {
  if (!url) return null;
  try {
    const src = new URL(url);
    src.searchParams.set('s', String(px));
    return src.toString();
  } catch {
    return null;
  }
};

// Always shown next to the login, so the image itself is decorative.
export const GithubAvatar: FC<{ url?: string | null; size?: number; className?: string; eager?: boolean }> = ({
  url,
  size = 24,
  className,
  eager = false,
}) => {
  const src = sizedAvatarUrl(url, size * 2);

  if (!src) {
    return (
      <span
        className={cn('inline-block shrink-0 rounded-full bg-muted', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      unoptimized
      src={src}
      alt=""
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('shrink-0 rounded-full bg-muted', className)}
    />
  );
};

/** A landing section: eyebrow, title, intro and an optional link on the right. */
export const LandingSection: FC<{
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}> = ({ id, eyebrow, title, intro, action, children, className }) => (
  <section aria-labelledby={id} className={cn('flex flex-col gap-6 py-12 lg:gap-8 lg:py-20', className)}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl flex-col gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</span>
        <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {title}
        </h2>
        {intro && <p className="text-muted-foreground">{intro}</p>}
      </div>
      {action && <div className="shrink-0 text-sm">{action}</div>}
    </div>
    {children}
  </section>
);

const compact = [1, 2].map(
  (digits) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: digits }),
);
const full = new Intl.NumberFormat('en-US');

/** 1.7M by default; `precise` keeps two decimals (1.67M) where the digits are the point. */
export const formatCompact = (value?: number | null, precise = false) =>
  typeof value === 'number' ? compact[precise ? 1 : 0].format(value) : '';
export const formatFull = (value?: number | null) => (typeof value === 'number' ? full.format(value) : '');
