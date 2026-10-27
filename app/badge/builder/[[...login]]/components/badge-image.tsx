'use client';

import { useTheme } from 'next-themes';

import { entityName } from '../utils/badge-options';
import { type Style, styleQuery } from '../utils/builder-state';
import { badgeImageUrl, withTheme } from '../utils/snippets';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import type { EntityFacts } from '@/badge/v3/facts';
import type { Theme } from '@/badge/v3/types';
import { cn } from '@/lib/utils';

/** The site's theme as the visitor sees it. */
export function usePageTheme(): Theme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? 'dark' : 'light';
}

/** A badge's own URL on this site; an Auto badge pinned to `theme`, so it matches the ground it sits on. */
export function previewSrc(facts: EntityFacts, badge: BadgeDefinition, style: Style, theme: Theme): string {
  const query = styleQuery(badge, style);
  const url = badgeImageUrl('', facts.kind, entityName(facts), badge.id, query);
  return (query.get('scheme') ?? 'auto') === 'auto' ? withTheme(url, theme) : url;
}

/** The real badge image, drawn by the same renderer a README gets. */
export function BadgeImage({
  facts,
  badge,
  style,
  theme,
  alt,
  className,
}: Readonly<{
  facts: EntityFacts;
  badge: BadgeDefinition;
  style: Style;
  theme: Theme;
  alt: string;
  className?: string;
}>) {
  const size = badge.size;
  return (
    <img
      src={previewSrc(facts, badge, style, theme)}
      alt={alt}
      width={size?.width}
      height={badge.format === 'shield' ? 20 : size?.height}
      loading="lazy"
      decoding="async"
      className={cn(badge.format === 'shield' ? 'h-5 w-auto max-w-full' : 'h-auto w-full', className)}
    />
  );
}
