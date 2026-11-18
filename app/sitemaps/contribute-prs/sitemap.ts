'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { readPublicPrTimelines } from '@/lib/contribute/pr-timeline.data';
import { prTimelineSitemapEntries } from '@/lib/sitemap/pr-timeline-sitemap';

/** The public pull request timelines (their newest 5,000): empty while none is shown, or on a failed read. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await readPublicPrTimelines();
  if (items?.length) cacheLife('hours');
  else cacheLife('minutes');
  return prTimelineSitemapEntries(items ?? []);
}
