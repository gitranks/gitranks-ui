import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';

import { repoTabPath } from '@/app/repo/[owner]/[name]/utils/repo-tabs';
import { fetchRepoTabsForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { SITEMAP_REPO_TAB_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { RepoSitemapTab } from '@/types/generated/graphql';

const TAB_PATHS = { [RepoSitemapTab.UsedBy]: 'used-by', [RepoSitemapTab.Contributors]: 'contributors' } as const;

/** Every part a repository tab's sitemap can have; the index lists those that hold repositories. */
export function repoTabSitemapParts() {
  return Array.from({ length: SITEMAP_REPO_TAB_PARTS_MAX }, (_, id) => ({ id }));
}

/**
 * One part of a repository tab's pages (`/repo/<owner>/<name>/used-by` or `/contributors`), up to 40,000 a part. A part
 * whose names cannot be read is empty.
 */
export async function repoTabSitemap(tab: RepoSitemapTab, id: Promise<string>): Promise<MetadataRoute.Sitemap> {
  const part = Number(await id);
  if (!Number.isInteger(part) || part < 0 || part >= SITEMAP_REPO_TAB_PARTS_MAX) {
    return [];
  }

  const names = await fetchRepoTabsForSitemap(tab, part);
  const lastModified = startOfMonth(new Date()).toISOString();

  return names.map((nameWithOwner) =>
    sitemapEntry(repoTabPath(nameWithOwner, TAB_PATHS[tab]), { lastModified, priority: 0.5 }),
  );
}
