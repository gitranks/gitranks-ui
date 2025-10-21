import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountryLanguageRankingDocument, type CountryLanguageRankingQueryVariables } from '@/types/generated/graphql';

export const fetchCountryLanguageRankings = async (props: CountryLanguageRankingQueryVariables) => {
  'use cache';
  cacheLife('days');

  const { countryLanguageRankings } = (await graphqlDirect(CountryLanguageRankingDocument, props)) ?? {};

  if (!countryLanguageRankings) {
    return [];
  }

  return countryLanguageRankings;
};
