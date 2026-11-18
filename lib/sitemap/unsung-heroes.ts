import type { MetadataRoute } from 'next';

import { packagesPublicNow } from '@/lib/sitemap/packages-public';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { UNSUNG_HEROES_PATH } from '@/lib/unsung-hero/unsung-hero';

/**
 * The static sitemap's line for the Unsung heroes archive, once it is open to everyone (with the package pages); none
 * before, so the sitemap is then exactly what it was. The gate's answer is kept per server and asked again at most once
 * a minute, so a crawl does not ask it per request.
 */
export async function unsungHeroesSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  if (!(await packagesPublicNow())) {
    return [];
  }
  return [sitemapEntry(UNSUNG_HEROES_PATH, { changeFrequency: 'weekly', priority: 0.6 })];
}
