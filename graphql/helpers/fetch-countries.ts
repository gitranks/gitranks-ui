import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountryDocument } from '@/types/generated/graphql';

export const fetchCountries = async () => {
  'use cache';
  cacheLife('max');

  const { country } = (await graphqlDirect(CountryDocument)) ?? {};

  if (!country) {
    return [];
  }

  return country;
};
