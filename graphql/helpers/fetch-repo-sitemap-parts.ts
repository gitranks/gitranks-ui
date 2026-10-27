import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoSitemapPartsDocument, ReposForSitemapDocument } from '@/types/generated/graphql';

/** How many repository sitemaps the index lists; 0 for minutes when the count cannot be read, so the index still answers. */
export const fetchRepoSitemapParts = async () => {
  'use cache';

  try {
    const { repoSitemapParts } = (await graphqlDirect(RepoSitemapPartsDocument)) ?? {};
    cacheLife('hours');
    return repoSitemapParts ?? 0;
  } catch (error) {
    console.error('fetchRepoSitemapParts:', error);
    cacheLife('minutes');
    return 0;
  }
};

/**
 * One part's repositories (`owner/name`), most starred first. Only the names are cached (~1 MB a part); an error is
 * an empty part for minutes, so a build or a crawl never fails on it.
 */
export const fetchReposForSitemap = async (part: number) => {
  'use cache';

  try {
    const { reposForSitemap } = (await graphqlDirect(ReposForSitemapDocument, { part })) ?? {};
    cacheLife('hours');
    return reposForSitemap ?? [];
  } catch (error) {
    console.error('fetchReposForSitemap:', error);
    cacheLife('minutes');
    return [];
  }
};
