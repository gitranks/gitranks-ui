import type { MetadataRoute } from 'next';

import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { PACKAGE_RANKING_ORDER_LIST } from '@/app/packages/package-rankings';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';
import { SITEMAP_PAGE_DEPTH } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';
import { PackageRegistry } from '@/types/generated/graphql';
import { packageRankingPath } from '@/utils/package-paths';

/**
 * The three npm package rankings, each to the pages its ranked packages fill (at most `SITEMAP_PAGE_DEPTH.packages`).
 * 404 until package pages are open to everyone; no ranking page while the ranked count cannot be read.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await notFoundUnlessPackagesPublic();

  const depth = SITEMAP_PAGE_DEPTH.packages;
  const facts = await fetchPackageRankingFacts(PackageRegistry.Npm);
  const pages = Math.max(0, Math.min(depth, Math.ceil((facts?.ranked ?? 0) / ITEMS_PER_PAGE)));

  return Array.from({ length: pages }, (_, i) => i + 1).flatMap((page) => {
    const priority = sitemapPagePriority(page, depth);
    return PACKAGE_RANKING_ORDER_LIST.map((order) => sitemapEntry(packageRankingPath(order, page), { priority }));
  });
}
