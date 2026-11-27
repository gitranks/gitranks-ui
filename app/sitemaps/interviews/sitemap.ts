'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { loadInterviewsHome } from '@/lib/interviews/home.data';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { interviewsSitemapEntries } from '@/lib/sitemap/interviews-sitemap';

/**
 * Interviews' public pages: see `interviewsSitemapEntries`. Empty while Interviews is not open to everyone, and then
 * nothing is read (the site's index does not list this file either). A home read with no company lists the rest, for
 * minutes only.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!INTERVIEWS_OPEN_TO_EVERYONE) {
    cacheLife('hours');
    return [];
  }
  const home = await loadInterviewsHome();
  if (home.companies.length) cacheLife('hours');
  else cacheLife('minutes');
  return interviewsSitemapEntries(home);
}
