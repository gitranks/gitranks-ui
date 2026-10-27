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

const versions = new WeakMap<EntityFacts, string>();

/**
 * A short fingerprint of the facts the builder shows. A preview carries it (an image ignores unknown keys), so the
 * preview changes as soon as the entity's data does, instead of an image kept from before a fetch.
 */
export function factsVersion(facts: EntityFacts): string {
  let version = versions.get(facts);
  if (!version) {
    // FNV-1a over the facts as JSON.
    let hash = 0x811c9dc5;
    const json = JSON.stringify(facts);
    for (let index = 0; index < json.length; index++) {
      hash = Math.imul(hash ^ json.charCodeAt(index), 0x01000193);
    }
    version = (hash >>> 0).toString(36);
    versions.set(facts, version);
  }
  return version;
}

/**
 * A badge's own URL on this site, with the facts' version (see `factsVersion`); an Auto badge pinned to `theme`, so it
 * matches the ground it sits on. Only previews carry the version: the code to copy never does.
 */
export function previewSrc(facts: EntityFacts, badge: BadgeDefinition, style: Style, theme: Theme): string {
  const query = styleQuery(badge, style);
  const url = badgeImageUrl('', facts.kind, entityName(facts), badge.id, query);
  const pinned = (query.get('scheme') ?? 'auto') === 'auto' ? withTheme(url, theme) : url;
  return `${pinned}${pinned.includes('?') ? '&' : '?'}v=${factsVersion(facts)}`;
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
