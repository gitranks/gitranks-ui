import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';

import { apiRegistryOf, REGISTRY_IDS } from '@/lib/packages/registries';
import { fetchPackagesForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';
import { packageSitemapPartOf, SITEMAP_PACKAGE_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { packagePath } from '@/utils/package-paths';

/**
 * Every part a package-page sitemap can have: `SITEMAP_PACKAGE_PARTS_MAX` per registry, each registry its own run of
 * ids. The index lists only the parts that hold packages, and only once package pages are open to everyone; until then
 * every part answers 404. A part whose names cannot be read is empty.
 */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_PACKAGE_PARTS_MAX * REGISTRY_IDS.length }, (_, id) => ({ id }));
}

/**
 * One part of a registry's package pages, each at its canonical address (an npm scoped name as `@scope/name`): the
 * packages repositories with 100+ stars use, the most dependents' stars first, up to 40,000 a part.
 */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  await notFoundUnlessPackagesPublic();

  const target = packageSitemapPartOf(Number(await props.id));
  if (!target) {
    return [];
  }

  const names = await fetchPackagesForSitemap(apiRegistryOf(target.registry), target.part);
  const lastModified = startOfMonth(new Date()).toISOString();

  return names.map((name) => sitemapEntry(packagePath(name, target.registry), { lastModified, priority: 0.7 }));
}
