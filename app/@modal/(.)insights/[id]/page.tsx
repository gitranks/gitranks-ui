import { notFound } from 'next/navigation';

import { InsightDetailModal } from '@/app/components/insight-detail-modal';
import { fetchInsight } from '@/graphql/helpers/fetch-insights';

type InsightModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightModalPage({ params }: InsightModalPageProps) {
  const { id } = await params;
  const { insight } = await fetchInsight(id);

  if (!insight) {
    notFound();
  }

  return <InsightDetailModal insight={insight} />;
}
