import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { LanguageRankingDocument, type LanguageRankingQueryVariables } from '@/types/generated/graphql';

export const fetchLanguageRankings = async (props: LanguageRankingQueryVariables) => {
  'use cache';
  cacheLife('days');

  const { languageRankings } = (await graphqlDirect(LanguageRankingDocument, props)) ?? {};

  if (!languageRankings) {
    return [];
  }

  return languageRankings;
};
