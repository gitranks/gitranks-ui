import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';

import { fetchPackagesForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';
import { SITEMAP_PACKAGE_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { PackageRegistry } from '@/types/generated/graphql';
import { packagePath } from '@/utils/package-paths';

/**
 * Every part a package-page sitemap can have. The index lists only the parts that hold packages, and only once package
 * pages are open to everyone; until then every part answers 404. A part whose names cannot be read is empty.
 */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_PACKAGE_PARTS_MAX }, (_, id) => ({ id }));
}

/**
 * One part of the npm package pages, each at its canonical address (a scoped name as `@scope/name`): the packages
 * repositories with 100+ stars use, the most dependents' stars first, up to 40,000 a part.
 */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  await notFoundUnlessPackagesPublic();

  const part = Number(await props.id);
  if (!Number.isInteger(part) || part < 0 || part >= SITEMAP_PACKAGE_PARTS_MAX) {
    return [];
  }

  const names = await fetchPackagesForSitemap(PackageRegistry.Npm, part);
  const lastModified = startOfMonth(new Date()).toISOString();

  return names.map((name) => sitemapEntry(packagePath(name), { lastModified, priority: 0.7 }));
}
