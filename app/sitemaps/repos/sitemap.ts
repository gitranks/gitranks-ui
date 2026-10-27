'use cache';

import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { SITEMAP_REPO_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { ReposForSitemapDocument } from '@/types/generated/graphql';
import { getRepoPath } from '@/utils/repo-paths';

/**
 * Every part a repository sitemap can have, so building the app needs no data. The index lists only the parts
 * that hold repositories (`fetchRepoSitemapParts`); any other part is an empty sitemap.
 */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_REPO_PARTS_MAX }, (_, id) => ({ id }));
}

/** One part of the repository pages: the most starred repositories first, up to 40,000 a part. */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  cacheLife('hours');

  const part = Number(await props.id);
  if (!Number.isInteger(part) || part < 0 || part >= SITEMAP_REPO_PARTS_MAX) {
    return [];
  }

  const { reposForSitemap } = (await graphqlDirect(ReposForSitemapDocument, { part })) ?? {};
  const lastModified = startOfMonth(new Date()).toISOString();

  return (reposForSitemap ?? []).map((nameWithOwner) =>
    sitemapEntry(getRepoPath(nameWithOwner), { lastModified, priority: 0.7 }),
  );
}
