import { notFound } from 'next/navigation';

import { InsightDetailContent } from '@/app/components/insight-detail-content';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchInsightServer } from '@/graphql/helpers/fetch-insights-server';

type InsightDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightDetailsPage({ params }: InsightDetailsPageProps) {
  const { id } = await params;
  const { insight } = await fetchInsightServer(id);

  if (!insight) {
    notFound();
  }

  return (
    <>
      <Header />
      <Page className="gap-4">
        <h1 className="text-2xl font-semibold">Insight</h1>
        <InsightDetailContent insight={insight} />
      </Page>
    </>
  );
}
