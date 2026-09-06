import { startOfMonth } from 'date-fns';

import { SITEMAP_SEGMENTS, type SitemapSegment } from '@/lib/sitemap/sitemap.consts';
import { absoluteSitemapUrl } from '@/lib/sitemap/sitemap-url';

export function childSitemapLoc(segment: SitemapSegment): string {
  return absoluteSitemapUrl(`/sitemaps/${segment}/sitemap.xml`);
}

/**
 * `lastmod` must reflect real content change. Stamping request time on every fetch
 * makes crawlers distrust the signal, so anchor it to the month like the child sitemaps.
 */
export function buildSitemapIndexXml(lastModified = startOfMonth(new Date())): string {
  const lastmod = lastModified.toISOString();
  const entries = SITEMAP_SEGMENTS.map(
    (segment) => `  <sitemap>
    <loc>${childSitemapLoc(segment)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

/** Absolute locs for IndexNow / tooling that walks the index. */
export function listChildSitemapUrls(): string[] {
  return SITEMAP_SEGMENTS.map(childSitemapLoc);
}

export function sitemapIndexResponse(): Response {
  // buildSitemapIndexXml resolves the base URL per loc and throws on misconfig.
  return new Response(buildSitemapIndexXml(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
