import { graphqlClient } from '@/lib/graphql/graphql-client';
import { InsightDocument, InsightsDocument } from '@/types/generated/graphql';

type FetchInsightsOptions = {
  skip?: number;
  limit?: number;
};

export const fetchInsightsClient = async ({ skip = 0, limit = 20 }: FetchInsightsOptions = {}) => {
  const { insights } =
    (await graphqlClient(InsightsDocument, { skip, limit }, { cache: 'force-cache', next: { revalidate: 60 } })) ?? {};

  return { insights };
};

export const fetchInsightClient = async (id: string) => {
  const { insight } =
    (await graphqlClient(InsightDocument, { id }, { cache: 'force-cache', next: { revalidate: 60 } })) ?? {};

  if (insight) {
    return { insight };
  }

  return { insight: null };
};
