import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountrySummaryDocument, CountrySummaryOrder } from '@/types/generated/graphql';

/** Every country's monthly summary with its leaders, in ranking order: the latest snapshot unless `date` names one. */
export const fetchCountrySummaries = async (
  orderFromParams: CountrySummaryOrder = CountrySummaryOrder.Stars,
  date?: string | null,
) => {
  'use cache';
  cacheLife('days');

  const order = orderFromParams.toUpperCase() as CountrySummaryOrder;

  const { countrySummary } = (await graphqlDirect(CountrySummaryDocument, { order, date })) ?? {};

  if (!countrySummary) {
    return [];
  }

  return countrySummary;
};
