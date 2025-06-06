import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountrySummaryDocument, CountrySummaryOrder } from '@/types/generated/graphql';

export const fetchCountrySummaries = async (orderFromParams: CountrySummaryOrder = CountrySummaryOrder.Stars) => {
  'use cache';
  cacheLife('days');

  const order = orderFromParams.toUpperCase() as CountrySummaryOrder;

  const { countrySummary } = (await graphqlDirect(CountrySummaryDocument, { order })) ?? {};

  if (!countrySummary) {
    return [];
  }

  return countrySummary;
};
