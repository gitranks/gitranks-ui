import type { MetadataRoute } from 'next';

import { repoTabSitemap, repoTabSitemapParts } from '@/lib/sitemap/repo-tab-sitemap';
import { RepoSitemapTab } from '@/types/generated/graphql';

export async function generateSitemaps() {
  return repoTabSitemapParts();
}

/** One part of the repositories' Used by tabs: those whose packages repositories with 100+ stars use. */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return repoTabSitemap(RepoSitemapTab.UsedBy, props.id);
}
