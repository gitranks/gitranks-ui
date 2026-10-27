import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { OrgSitemapPartsDocument, OrgsForSitemapDocument } from '@/types/generated/graphql';

/** How many organization-page sitemaps the index lists; 0 for minutes when the count cannot be read, so the index still answers. */
export const fetchOrgSitemapParts = async () => {
  'use cache';

  try {
    const { orgSitemapParts } = (await graphqlDirect(OrgSitemapPartsDocument)) ?? {};
    cacheLife('hours');
    return orgSitemapParts ?? 0;
  } catch (error) {
    console.error('fetchOrgSitemapParts:', error);
    cacheLife('minutes');
    return 0;
  }
};

/**
 * One part's organization logins, most starred first. Only the logins are cached; an error is an empty part for
 * minutes, so a build or a crawl never fails on it.
 */
export const fetchOrgsForSitemap = async (part: number) => {
  'use cache';

  try {
    const { orgsForSitemap } = (await graphqlDirect(OrgsForSitemapDocument, { part })) ?? {};
    cacheLife('hours');
    return orgsForSitemap ?? [];
  } catch (error) {
    console.error('fetchOrgsForSitemap:', error);
    cacheLife('minutes');
    return [];
  }
};
