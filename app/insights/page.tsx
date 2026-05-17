'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import { InsightsList } from './insights-list';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchInsightsServer } from '@/graphql/helpers/fetch-insights-server';

export default async function InsightsPage() {
  cacheLife('minutes');
  cacheTag(`insights`);

  const { insights = [] } = await fetchInsightsServer({ skip: 0, limit: 20 });

  return (
    <>
      <Header />
      <Page className="gap-4">
        <h1 className="text-2xl font-semibold">Social Media Posts</h1>
        <InsightsList initialInsights={insights} />
      </Page>
    </>
  );
}
