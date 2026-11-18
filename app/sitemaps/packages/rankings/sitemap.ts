import type { MetadataRoute } from 'next';

import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { packageRankingOrdersOf } from '@/app/packages/package-rankings';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';
import { apiRegistryOf, REGISTRY_IDS, type RegistryId } from '@/lib/packages/registries';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';
import { SITEMAP_PAGE_DEPTH } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';
import { packageRankingPath } from '@/utils/package-paths';

/** One registry's rankings, each to the pages its ranked packages fill; none while the ranked count cannot be read. */
async function registryEntries(registry: RegistryId): Promise<MetadataRoute.Sitemap> {
  const depth = SITEMAP_PAGE_DEPTH.packages;
  const facts = await fetchPackageRankingFacts(apiRegistryOf(registry));
  const pages = Math.max(0, Math.min(depth, Math.ceil((facts?.ranked ?? 0) / ITEMS_PER_PAGE)));

  return Array.from({ length: pages }, (_, i) => i + 1).flatMap((page) => {
    const priority = sitemapPagePriority(page, depth);
    return packageRankingOrdersOf(registry).map((order) =>
      sitemapEntry(packageRankingPath(order, page, registry), { priority }),
    );
  });
}

/**
 * Each registry's package rankings (npm's three), each to the pages its ranked packages fill (at most
 * `SITEMAP_PAGE_DEPTH.packages`). 404 until package pages are open to everyone.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await notFoundUnlessPackagesPublic();

  return (await Promise.all(REGISTRY_IDS.map(registryEntries))).flat();
}
