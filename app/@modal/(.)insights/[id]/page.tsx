import { notFound } from 'next/navigation';

import { InsightDetailModal } from '@/components/insight/insight-detail-modal';
import { fetchInsightServer } from '@/graphql/helpers/fetch-insights-server';

type InsightModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightModalPage({ params }: InsightModalPageProps) {
  const { id } = await params;
  const { insight } = await fetchInsightServer(id);

  if (!insight) {
    notFound();
  }

  return <InsightDetailModal insight={insight} />;
}
