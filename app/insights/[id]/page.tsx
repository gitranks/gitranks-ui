import { notFound } from 'next/navigation';

import { InsightDetailContent } from '@/app/components/insight-detail-content';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchInsight } from '@/graphql/helpers/fetch-insights';

type InsightDetailsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightDetailsPage({ params }: InsightDetailsPageProps) {
  const { id } = await params;
  const { insight } = await fetchInsight(id);

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
