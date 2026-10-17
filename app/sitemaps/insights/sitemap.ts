'use cache';

import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { fetchInsightsServer } from '@/graphql/helpers/fetch-insights-server';
import { isRecentPost, recentInsightEntries } from '@/lib/sitemap/recent-insights';
import { SITEMAP_INSIGHTS } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** The most posts the list query returns per request. */
const QUERY_LIMIT = 100;

/** Recent insight posts: see `SITEMAP_INSIGHTS` for which ones. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  cacheLife('hours');

  const now = new Date();
  const posts: Awaited<ReturnType<typeof fetchInsightsServer>>['insights'] = [];

  // Posts come newest first: stop at a short page, at the post cap, or once a page reaches past the age limit.
  for (let skip = 0; posts.length < SITEMAP_INSIGHTS.maxPosts; skip += QUERY_LIMIT) {
    const { insights = [] } = await fetchInsightsServer({ skip, limit: QUERY_LIMIT });
    posts.push(...insights);

    const oldest = insights.at(-1);
    if (insights.length < QUERY_LIMIT || !oldest || !isRecentPost(oldest.createdAt, now, SITEMAP_INSIGHTS.maxAgeDays)) {
      break;
    }
  }

  return recentInsightEntries(posts, now, SITEMAP_INSIGHTS).map(({ id, lastModified }) =>
    sitemapEntry(`/insights/${encodeURIComponent(id)}`, { lastModified: lastModified.toISOString(), priority: 0.5 }),
  );
}
