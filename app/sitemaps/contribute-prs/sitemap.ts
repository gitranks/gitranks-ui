'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { loadMergedFixKeys } from '@/lib/learn/fix-page.data';
import { prTimelineSitemapEntries } from '@/lib/sitemap/pr-timeline-sitemap';
import { readPublicPrTimelines } from '@/lib/workspace/pr-timeline.data';

/**
 * The public pull request pages (their newest 5,000), each at its canonical address: empty while none is shown, or on
 * a failed read. A merged Learn fix is listed at "Learn from it". When the merged fixes cannot be read no address is
 * known to be canonical, so none is listed, for minutes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [items, fixes] = await Promise.all([readPublicPrTimelines(), loadMergedFixKeys()]);
  if (items?.length && fixes) cacheLife('hours');
  else cacheLife('minutes');
  return fixes ? prTimelineSitemapEntries(items ?? [], fixes) : [];
}
