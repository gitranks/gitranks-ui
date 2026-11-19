import type { MetadataRoute } from 'next';

import type { PublicPrTimeline } from '@/lib/contribute/pr-timeline.types';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/** The shown pull request timelines, each at its last change: none until timelines are public. */
export const prTimelineSitemapEntries = (items: readonly PublicPrTimeline[]): MetadataRoute.Sitemap =>
  items.map((item) =>
    sitemapEntry(prTimelinePath(item), { lastModified: item.modifiedAt, changeFrequency: 'weekly', priority: 0.4 }),
  );
