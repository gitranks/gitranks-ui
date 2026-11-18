import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  type PackageRegistry,
  PackageSitemapPartsDocument,
  PackagesForSitemapDocument,
  type RepoSitemapTab,
  RepoTabSitemapPartsDocument,
  RepoTabsForSitemapDocument,
} from '@/types/generated/graphql';

// Read only once package pages are open to everyone. Cached as the repository sitemaps are: an answer for hours; no
// answer (an error, or none while the pages are hidden from the site) is 0 parts or an empty part for minutes, so the
// index and every part still answer.

/** How many package-page sitemaps of a registry the index lists. */
export const fetchPackageSitemapParts = async (registry: PackageRegistry) => {
  'use cache';

  try {
    const { packageSitemapParts } = (await graphqlDirect(PackageSitemapPartsDocument, { registry })) ?? {};
    if (typeof packageSitemapParts !== 'number') {
      cacheLife('minutes');
      return 0;
    }
    cacheLife('hours');
    return packageSitemapParts;
  } catch (error) {
    console.error('fetchPackageSitemapParts:', error);
    cacheLife('minutes');
    return 0;
  }
};

/** One part's package names, the most dependents' stars first, up to 40,000 a part. Only the names are cached. */
export const fetchPackagesForSitemap = async (registry: PackageRegistry, part: number) => {
  'use cache';

  try {
    const { packagesForSitemap } = (await graphqlDirect(PackagesForSitemapDocument, { registry, part })) ?? {};
    if (!packagesForSitemap) {
      cacheLife('minutes');
      return [];
    }
    cacheLife('hours');
    return packagesForSitemap;
  } catch (error) {
    console.error('fetchPackagesForSitemap:', error);
    cacheLife('minutes');
    return [];
  }
};

/** How many sitemaps of a repository tab the index lists. */
export const fetchRepoTabSitemapParts = async (tab: RepoSitemapTab) => {
  'use cache';

  try {
    const { repoTabSitemapParts } = (await graphqlDirect(RepoTabSitemapPartsDocument, { tab })) ?? {};
    if (typeof repoTabSitemapParts !== 'number') {
      cacheLife('minutes');
      return 0;
    }
    cacheLife('hours');
    return repoTabSitemapParts;
  } catch (error) {
    console.error('fetchRepoTabSitemapParts:', error);
    cacheLife('minutes');
    return 0;
  }
};

/** One part of a repository tab's repositories (`owner/name`), up to 40,000 a part. Only the names are cached. */
export const fetchRepoTabsForSitemap = async (tab: RepoSitemapTab, part: number) => {
  'use cache';

  try {
    const { repoTabsForSitemap } = (await graphqlDirect(RepoTabsForSitemapDocument, { tab, part })) ?? {};
    if (!repoTabsForSitemap) {
      cacheLife('minutes');
      return [];
    }
    cacheLife('hours');
    return repoTabsForSitemap;
  } catch (error) {
    console.error('fetchRepoTabsForSitemap:', error);
    cacheLife('minutes');
    return [];
  }
};
