import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { InsightDocument, InsightsDocument } from '@/types/generated/graphql';

type FetchInsightsOptions = {
  skip?: number;
  limit?: number;
};

export const fetchInsightsServer = async ({ skip = 0, limit = 20 }: FetchInsightsOptions = {}) => {
  const { insights } = (await graphqlDirect(InsightsDocument, { skip, limit }, { revalidate: 60 })) ?? {};

  return { insights };
};

export const fetchInsightServer = async (id: string) => {
  const { insight } = (await graphqlDirect(InsightDocument, { id }, { revalidate: 60 })) ?? {};

  if (insight) {
    return { insight };
  }

  return { insight: null };
};
