import { SITEMAP_SEGMENTS, type SitemapSegment } from '@/lib/sitemap/sitemap.consts';
import { absoluteSitemapUrl, getSitemapBaseUrl } from '@/lib/sitemap/sitemap-url';

export function childSitemapLoc(segment: SitemapSegment): string {
  return absoluteSitemapUrl(`/sitemaps/${segment}/sitemap.xml`);
}

export function buildSitemapIndexXml(lastModified = new Date()): string {
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
  // Touch base URL early so misconfig fails loudly in the index route.
  getSitemapBaseUrl();

  return new Response(buildSitemapIndexXml(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
