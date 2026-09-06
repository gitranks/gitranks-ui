'use cache';

import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';
import { cacheLife } from 'next/cache';

import { listCanonicalBadgeImageUrls } from '@/badge/canonical-badge';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';
import { ProfilesForSitemapDocument } from '@/types/generated/graphql';

/**
 * Unchunked on purpose: `profilesForSitemap` is capped server-side at 1000 logins per
 * rank order (stars + contributions, deduped), so ~2k urls at ~830 bytes each. Well under
 * the 50k url / 50MB limits; past ~25k profiles this needs `generateSitemaps`.
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
      images: listCanonicalBadgeImageUrls(profile.login),
    }),
  );
}
