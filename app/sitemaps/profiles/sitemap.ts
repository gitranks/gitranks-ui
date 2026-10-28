'use cache';

import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { listProfileImageUrls } from '@/lib/sitemap/badge-images';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { ProfilesForSitemapDocument } from '@/types/generated/graphql';

/**
 * Unchunked on purpose: `profilesForSitemap` returns at most 1000 logins per
 * rank order (stars + contributions, deduped), so ~2k urls at ~600 bytes each with their images.
 * Well under the 50k url / 50MB limits; past 50k profiles this needs `generateSitemaps`.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  cacheLife('hours');

  const { profilesForSitemap } = (await graphqlDirect(ProfilesForSitemapDocument)) ?? {};
  if (!profilesForSitemap?.length) {
    return [];
  }

  const lastModified = startOfMonth(new Date()).toISOString();

  return profilesForSitemap.map((profile) =>
    sitemapEntry(`/profile/${encodeURIComponent(profile.login)}`, {
      lastModified,
      priority: 0.95,
      images: listProfileImageUrls(profile.login, profile),
    }),
  );
}
