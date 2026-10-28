import { notFound } from 'next/navigation';
import { connection } from 'next/server';

import { InsightDetailModal } from '@/components/insight/insight-detail-modal';
import { fetchInsightServer } from '@/graphql/helpers/fetch-insights-server';

type InsightModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InsightModalPage({ params }: InsightModalPageProps) {
  const { id } = await params;
  // The modal opens on in-app navigation and reads the post fresh: the fetch is not cached, so `connection()` keeps it
  // out of prerendering. (The full page, /insights/[id], reads it through a minutes-long cache instead.)
  await connection();
  const { insight } = await fetchInsightServer(id);

  if (!insight) {
    notFound();
  }

  return <InsightDetailModal insight={insight} />;
}
