import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountryLanguageSummaryDocument, CountryLanguageSummaryQueryVariables } from '@/types/generated/graphql';

export const fetchCountryLanguageSummaries = async (props: CountryLanguageSummaryQueryVariables) => {
  'use cache';
  cacheLife('days');

  const { countryLanguageSummary } = (await graphqlDirect(CountryLanguageSummaryDocument, props)) ?? {};

  if (!countryLanguageSummary) {
    return [];
  }

  return countryLanguageSummary;
};
