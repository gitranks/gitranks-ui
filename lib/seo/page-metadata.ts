import type { Metadata } from 'next';

import { SITE_NAME, SITE_X_HANDLE } from './site';

type PageMetadataInput = {
  /** A plain title gets the root ` | GitRanks` template; `absolute` skips it. */
  title: string | { absolute: string };
  description: string;
  /** Canonical path with URI-encoded segments; resolved against the root `metadataBase`. */
  path: string;
  /** Absolute image URLs for link previews. */
  images?: string[];
  openGraphType?: 'website' | 'profile';
  /** ISO date; makes the preview an `article` with this publish time. */
  publishedTime?: string;
};

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
    openGraph: publishedTime ? { ...openGraph, type: 'article', publishedTime } : { ...openGraph, type: openGraphType },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      site: SITE_X_HANDLE,
      title: previewTitle,
      description,
      images,
    },
  };
}

/** ` · Page 3` for every page but the first: the title suffix. */
export function pageSuffix(page: number): string {
  return page > 1 ? ` · Page ${page}` : '';
}

/** `, page 3` for every page but the first, so paginated descriptions differ. */
export function pageClause(page: number): string {
  return page > 1 ? `, page ${page}` : '';
}
