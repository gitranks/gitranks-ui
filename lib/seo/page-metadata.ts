import type { Metadata } from 'next';

import type { EntityImages } from './json-ld';
import { SITE_NAME, SITE_X_HANDLE } from './site';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';

/** An absolute image URL, or one with its alt text and, when known, its size. */
export type PreviewImage = string | { url: string; width?: number; height?: number; alt: string };

type PageMetadataInput = {
  /** A plain title gets the root ` | GitRanks` template; `absolute` skips it. */
  title: string | { absolute: string };
  description: string;
  /** Canonical path with URI-encoded segments; resolved against the root `metadataBase`. */
  path: string;
  /** Absolute image URLs for link previews. */
  images?: PreviewImage[];
} & (
  | { openGraphType?: 'website' | 'profile'; publishedTime?: never }
  /** An article preview carries its publish time (ISO date). */
  | { openGraphType: 'article'; publishedTime: string }
);

/**
 * Title, description, self-canonical and link-preview tags for one page.
 *
 * Metadata merges shallowly, so a page that sets `openGraph` replaces the root one entirely;
 * this repeats the site-wide fields every page needs.
 */
export function pageMetadata({
  title,
  description,
  path,
  images,
  openGraphType = 'website',
  publishedTime,
}: PageMetadataInput): Metadata {
  const previewTitle = typeof title === 'string' ? title : title.absolute;
  const openGraph = {
    siteName: SITE_NAME,
    locale: 'en_US',
    url: path,
    title: previewTitle,
    description,
    images,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph:
      openGraphType === 'article'
        ? { ...openGraph, type: 'article', publishedTime }
        : { ...openGraph, type: openGraphType },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      site: SITE_X_HANDLE,
      title: previewTitle,
      description,
      images,
    },
  };
}

/**
 * The link preview of a developer's, an organization's or a repository's page: its card drawn at 1200×630 when it
 * has one, else its avatar; none without either. Each with its caption as the alt text.
 */
export function entityPreviewImages({ avatar, card }: EntityImages): PreviewImage[] | undefined {
  if (card) {
    return [{ url: card.url, ...SOCIAL_CARD_SIZE, alt: card.caption }];
  }
  return avatar ? [{ url: avatar.url, alt: avatar.caption }] : undefined;
}

/** ` · Page 3` for every page but the first: the title suffix. */
export function pageSuffix(page: number): string {
  return page > 1 ? ` · Page ${page}` : '';
}

/** `, page 3` for every page but the first, so paginated descriptions differ. */
export function pageClause(page: number): string {
  return page > 1 ? `, page ${page}` : '';
}
