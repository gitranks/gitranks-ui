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
}: PageMetadataInput): Metadata {
  const previewTitle = typeof title === 'string' ? title : title.absolute;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: openGraphType,
      siteName: SITE_NAME,
      locale: 'en_US',
      url: path,
      title: previewTitle,
      description,
      images,
    },
    twitter: {
      card: images?.length ? 'summary_large_image' : 'summary',
      site: SITE_X_HANDLE,
      title: previewTitle,
      description,
      images,
    },
  };
}

/** ` · Page 3` for every page but the first. */
export function pageSuffix(page: number): string {
  return page > 1 ? ` · Page ${page}` : '';
}
