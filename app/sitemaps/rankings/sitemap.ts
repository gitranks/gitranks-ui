import type { MetadataRoute } from 'next';

import { SITEMAP_PAGE_DEPTH, SITEMAP_RANKING_TYPES } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const pagesToParse = SITEMAP_PAGE_DEPTH.rankings;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);

  return pages.flatMap((page) => {
    const priority = sitemapPagePriority(page, pagesToParse);
    return SITEMAP_RANKING_TYPES.map((rankingType) => sitemapEntry(`/by/${rankingType}/${page}`, { priority }));
  });
}
