import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';

import { fetchReposForSitemap } from '@/graphql/helpers/fetch-repo-sitemap-parts';
import { SITEMAP_REPO_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { getRepoPath } from '@/utils/repo-paths';

/**
 * Every part a repository sitemap can have. The index lists only the parts that hold repositories
 * (`fetchRepoSitemapParts`); any other part is an empty sitemap, and a part whose names cannot be read is empty too.
 */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_REPO_PARTS_MAX }, (_, id) => ({ id }));
}

/** One part of the repository pages: the most starred repositories first, up to 40,000 a part. */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const part = Number(await props.id);
  if (!Number.isInteger(part) || part < 0 || part >= SITEMAP_REPO_PARTS_MAX) {
    return [];
  }

  const names = await fetchReposForSitemap(part);
  const lastModified = startOfMonth(new Date()).toISOString();

  return names.map((nameWithOwner) => sitemapEntry(getRepoPath(nameWithOwner), { lastModified, priority: 0.7 }));
}
