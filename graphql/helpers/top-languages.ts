import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { TopLanguagesDocument, type TopLanguagesQueryVariables } from '@/types/generated/graphql';

export const fetchTopLanguages = async (props: TopLanguagesQueryVariables) => {
  'use cache';
  cacheLife('max');

  const { languageSummary } = (await graphqlDirect(TopLanguagesDocument, props)) ?? {};

  if (!languageSummary) {
    return [];
  }

  return languageSummary;
};
