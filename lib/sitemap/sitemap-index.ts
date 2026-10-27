import { startOfMonth } from 'date-fns';

import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';
import { SITEMAP_REPO_PARTS_MAX, SITEMAP_SEGMENTS, type SitemapSegment } from '@/lib/sitemap/sitemap.consts';
import { absoluteSitemapUrl } from '@/lib/sitemap/sitemap-url';

export function childSitemapLoc(segment: SitemapSegment): string {
  return absoluteSitemapUrl(`/sitemaps/${segment}/sitemap.xml`);
}

/** The repository sitemap of one part, as `generateSitemaps` names it. */
export function repoSitemapLoc(part: number): string {
  return absoluteSitemapUrl(`/sitemaps/repos/sitemap/${part}.xml`);
}

/** Every child sitemap: the fixed segments, then the first `repoParts` repository parts. */
export function listChildSitemapLocs(repoParts = 0): string[] {
  const parts = Math.max(0, Math.min(Math.floor(repoParts), SITEMAP_REPO_PARTS_MAX));
  return [
    ...SITEMAP_SEGMENTS.map(childSitemapLoc),
    ...Array.from({ length: parts }, (_, part) => repoSitemapLoc(part)),
  ];
}

/**
 * `lastmod` must reflect real content change. Stamping request time on every fetch
 * makes crawlers distrust the signal, so anchor it to the month like the child sitemaps.
 */
export function buildSitemapIndexXml(locs: string[], lastModified = startOfMonth(new Date())): string {
  const lastmod = lastModified.toISOString();
  const entries = locs
    .map(
      (loc) => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

export async function sitemapIndexResponse(): Promise<Response> {
  // The locs resolve the base URL and throw on misconfig.
  const locs = listChildSitemapLocs(await fetchRepoSitemapParts());
  return new Response(buildSitemapIndexXml(locs), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
