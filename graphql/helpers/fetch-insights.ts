import { graphqlClient } from '@/lib/graphql/graphql-client';
import { InsightsDocument } from '@/types/generated/graphql';

export const fetchInsights = async () => {
  const { insights } =
    (await graphqlClient(InsightsDocument, {}, { cache: 'force-cache', next: { revalidate: 60 } })) ?? {};

  return { insights };
};
