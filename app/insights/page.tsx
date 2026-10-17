'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { InsightsLoadMore } from './insights-load-more';
import { Header } from '@/components/header/header';
import { InsightPostCard } from '@/components/insight/insight-post-card';
import { Page } from '@/components/page/page';
import { fetchInsightsServer } from '@/graphql/helpers/fetch-insights-server';
import { pageMetadata } from '@/lib/seo/page-metadata';

const PAGE_SIZE = 20;

// async: the file-level `use cache` directive requires it.
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Social Media Posts',
    description:
      'GitRanks posts about GitHub developers: top star gainers, rank and score milestones, and country and language trends, as shared on X, Bluesky and Mastodon.',
    path: '/insights',
  });
}

export default async function InsightsPage() {
  cacheLife('minutes');
  cacheTag(`insights`);

  const { insights = [] } = await fetchInsightsServer({ skip: 0, limit: PAGE_SIZE });

  // The first page renders on the server. Post dates read the current time only after mount
  // (see `InsightCreatedAt`); a read during a client render made Next render this list in the browser.
  return (
    <>
      <Header />
      <Page className="gap-4">
        <h1 className="text-2xl font-semibold">Social Media Posts</h1>
        <div className="flex flex-col gap-4">
          {insights.map((insight) => (
            <InsightPostCard key={insight.id} insight={insight} />
          ))}
          <InsightsLoadMore
            renderedIds={insights.map((insight) => insight.id)}
            pageSize={PAGE_SIZE}
            hasMore={insights.length === PAGE_SIZE}
          />
        </div>
      </Page>
    </>
  );
}
