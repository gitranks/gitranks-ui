import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

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
// generateStaticParams lists an id no post has, so every real one renders on request as a whole
// page before the response starts: an unknown or unpublished id answers 404. The page is then
// kept in the page cache for minutes, like the post it reads.
export const instant = false;

/** An id no post can have, so the build renders the not-found page without asking for data. */
const NO_POST_ID = '_';

export async function generateStaticParams() {
  return [{ id: NO_POST_ID }];
}

// Metadata and the page read the same post, kept for minutes: replies and scheduled posts show up soon.
async function getInsight(id: string) {
  'use cache';
  cacheLife('minutes');
  if (id === NO_POST_ID) return null;
  return (await fetchInsightServer(id)).insight;
}

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
