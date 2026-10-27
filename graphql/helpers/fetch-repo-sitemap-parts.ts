import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoSitemapPartsDocument } from '@/types/generated/graphql';

/** How many repository sitemaps the index lists; 0 when the count cannot be read, so the index still answers. */
export const fetchRepoSitemapParts = async () => {
  'use cache';
  cacheLife('hours');

  try {
    const { repoSitemapParts } = (await graphqlDirect(RepoSitemapPartsDocument)) ?? {};
    return repoSitemapParts ?? 0;
  } catch (error) {
    console.error('fetchRepoSitemapParts:', error);
    return 0;
  }
};
