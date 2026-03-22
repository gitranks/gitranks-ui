import { graphqlClient } from '@/lib/graphql/graphql-client';
import { InsightDocument, InsightsDocument } from '@/types/generated/graphql';

type FetchInsightsOptions = {
  skip?: number;
  limit?: number;
};

export const fetchInsights = async ({ skip = 0, limit = 20 }: FetchInsightsOptions = {}) => {
  console.time('fetchInsights');
  const { insights } =
    (await graphqlClient(InsightsDocument, { skip, limit }, { cache: 'force-cache', next: { revalidate: 60 } })) ?? {};

  return { insights };
};

export const fetchInsight = async (id: string) => {
  const { insight } =
    (await graphqlClient(InsightDocument, { id }, { cache: 'force-cache', next: { revalidate: 60 } })) ?? {};

  if (insight) {
    return { insight };
  }

  // Fallback for environments where single-item query is not yet available.
  let skip = 0;
  const limit = 20;

  while (skip <= 200) {
    const { insights = [] } = await fetchInsights({ skip, limit });
    const found = insights.find((post) => post.id === id);

    if (found) {
      return { insight: found };
    }

    if (insights.length < limit) {
      break;
    }

    skip += limit;
  }

  return { insight: null };
};
