import type { MetadataRoute } from 'next';

import { packagesPublicNow } from '@/lib/sitemap/packages-public';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { UNSUNG_HEROES_PATH } from '@/lib/unsung-hero/unsung-hero';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

/**
 * The static sitemap's lines for the pages that open with the package pages: the Unsung heroes archive and how
 * package rankings work. None before, so the sitemap is then exactly what it was. The gate's answer is kept per server
 * and asked again at most once a minute, so a crawl does not ask it per request.
 */
export async function packageStaticSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  if (!(await packagesPublicNow())) {
    return [];
  }
  return [
    sitemapEntry(UNSUNG_HEROES_PATH, { changeFrequency: 'weekly', priority: 0.6 }),
    sitemapEntry(PACKAGE_METHODOLOGY_PATH, { priority: 0.6 }),
  ];
}
