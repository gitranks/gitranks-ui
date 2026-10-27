'use client';

import { useTheme } from 'next-themes';

import { entityName, paramsOf } from '../utils/badge-options';
import { type Style, styleQuery } from '../utils/builder-state';
import { badgeImageUrl } from '../utils/snippets';
import type { BadgeDefinition } from '@/badge/v3/catalogue';
import type { EntityFacts } from '@/badge/v3/facts';
import { pendingQuery } from '@/badge/v3/pending';
import type { Theme } from '@/badge/v3/types';
import { cn } from '@/lib/utils';

/** The site's theme as the visitor sees it. */
export function usePageTheme(): Theme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? 'dark' : 'light';
}

const stamps = new WeakMap<EntityFacts, number>();

/**
 * When the builder got these facts: the stamp `pendingQuery` puts on a preview that waits on a read. It is fixed per
 * answer, so a preview is not fetched again at every keystroke, and new with every answer (a reload, a check again),
 * so a preview drawn before a read is never shown from a cache after it.
 */
export function factsStamp(facts: EntityFacts): number {
  let stamp = stamps.get(facts);
  if (stamp === undefined) {
    stamp = Date.now();
    stamps.set(facts, stamp);
  }
  return stamp;
}

/**
 * A badge's own URL on this site; an Auto badge pinned to `theme`, so it matches the ground it sits on. While the
 * image waits on a read it carries the facts' stamp (see `pendingQuery`); only previews do, never the code to copy.
 */
export function previewSrc(facts: EntityFacts, badge: BadgeDefinition, style: Style, theme: Theme): string {
  const query = styleQuery(badge, style);
  if ((query.get('scheme') ?? 'auto') === 'auto') query.set('theme', theme);
  const params = paramsOf(badge, style);
  if (params) {
    for (const [key, value] of Object.entries(pendingQuery(facts, badge, params, factsStamp(facts)))) {
      query.set(key, value);
    }
  }
  return badgeImageUrl('', facts.kind, entityName(facts), badge.id, query);
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
