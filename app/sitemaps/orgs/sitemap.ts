import type { MetadataRoute } from 'next';

import { SITEMAP_PAGE_DEPTH } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';

/** Owns every `/orgs/<page>` loc, page 1 included — do not duplicate it in the static sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pagesToParse = SITEMAP_PAGE_DEPTH.orgs;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);

  return pages.map((page) =>
    sitemapEntry(`/orgs/${page}`, {
      priority: sitemapPagePriority(page, pagesToParse),
    }),
  );
}
