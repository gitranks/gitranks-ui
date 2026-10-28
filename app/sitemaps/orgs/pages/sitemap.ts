import { startOfMonth } from 'date-fns';
import type { MetadataRoute } from 'next';

import { fetchOrgsForSitemap } from '@/graphql/helpers/fetch-org-sitemap-parts';
import { listOrgImageUrls } from '@/lib/sitemap/badge-images';
import { SITEMAP_ORG_PARTS_MAX } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/**
 * Every part an organization-page sitemap can have. The index lists only the parts that hold organizations
 * (`fetchOrgSitemapParts`); any other part is an empty sitemap, and a part whose logins cannot be read is empty too.
 */
export async function generateSitemaps() {
  return Array.from({ length: SITEMAP_ORG_PARTS_MAX }, (_, id) => ({ id }));
}

/**
 * One part of the organization pages (`/org/{login}`), each with the images it shows: organizations with 1,000+
 * stars, most starred first, up to 40,000 a part. The `/orgs/{page}` rankings stay in their own sitemap.
 */
export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const part = Number(await props.id);
  if (!Number.isInteger(part) || part < 0 || part >= SITEMAP_ORG_PARTS_MAX) {
    return [];
  }

  const logins = await fetchOrgsForSitemap(part);
  const lastModified = startOfMonth(new Date()).toISOString();

  return logins.map((login) =>
    sitemapEntry(`/org/${encodeURIComponent(login)}`, {
      lastModified,
      priority: 0.7,
      images: listOrgImageUrls(login),
    }),
  );
}
