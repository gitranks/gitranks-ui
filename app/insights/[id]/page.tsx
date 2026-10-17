import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';

import { buildInsightSEO } from './seo';
import { Header } from '@/components/header/header';
import { InsightDetailContent } from '@/components/insight/insight-detail-content';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Page } from '@/components/page/page';
import { fetchInsightServer } from '@/graphql/helpers/fetch-insights-server';

type InsightDetailsPageProps = {
  params: Promise<{ id: string }>;
};

// No post is known at build time, so the page renders on request and without a Suspense
// fallback: the post is in the server HTML instead of a segment streamed after the footer.
export const instant = false;

// Metadata and the page read the same post; fetch it once per request. The fetch is not cached,
// so `connection()` keeps it out of prerendering.
const getInsight = cache(async (id: string) => {
  await connection();
  return (await fetchInsightServer(id)).insight;
});

export async function generateMetadata({ params }: InsightDetailsPageProps): Promise<Metadata> {
  const { id } = await params;
  const insight = await getInsight(id);

  if (!insight) {
    notFound();
  }

  return buildInsightSEO(insight).metadata;
}

export default async function InsightDetailsPage({ params }: InsightDetailsPageProps) {
  const { id } = await params;
  const insight = await getInsight(id);

  if (!insight) {
    notFound();
  }

  return (
    <>
      <Header />
      <Page className="gap-4">
        <JsonLd payloads={buildInsightSEO(insight).jsonLd} />
        <h1 className="text-2xl font-semibold">Insight</h1>
        <InsightDetailContent insight={insight} />
      </Page>
    </>
  );
}
