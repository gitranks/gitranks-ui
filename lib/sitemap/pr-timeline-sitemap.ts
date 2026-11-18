import type { MetadataRoute } from 'next';

import type { PublicPrTimeline } from '@/lib/contribute/pr-timeline.types';
import { prTimelinePath } from '@/lib/contribute/pr-timeline-path';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** The shown pull request timelines, each at its last change: none until timelines are public. */
export const prTimelineSitemapEntries = (items: readonly PublicPrTimeline[]): MetadataRoute.Sitemap =>
  items.map((item) =>
    sitemapEntry(prTimelinePath(item), { lastModified: item.modifiedAt, changeFrequency: 'weekly', priority: 0.4 }),
  );
