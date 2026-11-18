import type { MetadataRoute } from 'next';

import { repoTabSitemap, repoTabSitemapParts } from '@/lib/sitemap/repo-tab-sitemap';
import { RepoSitemapTab } from '@/types/generated/graphql';

export async function generateSitemaps() {
  return repoTabSitemapParts();
}

/** One part of the repositories' Contributors tabs: those with contributor activity read. */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return repoTabSitemap(RepoSitemapTab.Contributors, props.id);
}
