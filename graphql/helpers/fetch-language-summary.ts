import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { LanguageSummaryDocument, LanguageSummaryQueryVariables } from '@/types/generated/graphql';

export const fetchLanguageSummaries = async (props: LanguageSummaryQueryVariables) => {
  'use cache';
  cacheLife('days');

  const { languageSummary } = (await graphqlDirect(LanguageSummaryDocument, props)) ?? {};

  if (!languageSummary) {
    return [];
  }

  return languageSummary;
};
