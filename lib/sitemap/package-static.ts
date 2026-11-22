import type { MetadataRoute } from 'next';

import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { UNSUNG_HEROES_PATH } from '@/lib/unsung-hero/unsung-hero';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

/** The static sitemap's lines for the package pages: the Unsung heroes archive and how package rankings work. */
export function packageStaticSitemapEntries(): MetadataRoute.Sitemap {
  return [
    sitemapEntry(UNSUNG_HEROES_PATH, { changeFrequency: 'weekly', priority: 0.6 }),
    sitemapEntry(PACKAGE_METHODOLOGY_PATH, { priority: 0.6 }),
  ];
}
