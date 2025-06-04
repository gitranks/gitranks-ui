import { unstable_cacheLife as cacheLife } from 'next/cache';
import { cache } from 'react';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { CountryDocument } from '@/types/generated/graphql';

export const fetchCountryList = cache(async () => {
  'use cache';
  cacheLife('max');

  const { country } = (await graphqlDirect(CountryDocument)) ?? {};

  if (!country) {
    return [];
  }

  return country;
});
