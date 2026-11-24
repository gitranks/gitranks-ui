import type { MetadataRoute } from 'next';

import { fixKeyOf } from '@/lib/learn/fix-page';
import { learnFixPath } from '@/lib/learn/paths';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import type { PublicPrTimeline } from '@/lib/workspace/pr-timeline.types';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/**
 * The shown pull request pages, each at its last change. A merged Learn fix (`learnFixes`, as `fixKeyOf` writes them)
 * is listed at "Learn from it", the view search engines keep; every other one at "How it was made".
 */
export const prTimelineSitemapEntries = (
  items: readonly PublicPrTimeline[],
  learnFixes: ReadonlySet<string> = new Set(),
): MetadataRoute.Sitemap =>
  items.map((item) =>
    sitemapEntry(learnFixes.has(fixKeyOf(item)) ? learnFixPath(item) : prTimelinePath(item), {
      lastModified: item.modifiedAt,
      changeFrequency: 'weekly',
      priority: 0.4,
    }),
  );
