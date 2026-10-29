import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';
import { HTML_LIMITED_BOT_UA_RE } from 'next/dist/shared/lib/router/utils/html-bots';

const isDev = process.env.NODE_ENV === 'development';

// Bots on this list get metadata blocking in <head> instead of streamed into <body>. Setting the
// option replaces Next's default list, so extend it with AI crawlers and fetchers that read the
// raw HTML without running scripts. The default comes from an internal path: re-check it when
// upgrading Next (a move fails the build, not silently). Requests from these bots skip the
// prerendered page and render on demand; cached data still applies.
const AI_HTML_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'meta-externalagent',
];
const htmlLimitedBots = new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|${AI_HTML_BOTS.join('|')}`, 'i');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Next's file-system page cache, but the pages of one developer, organization, repository or post stay in memory:
  // they render per URL, and a crawl would otherwise write each URL to disk. See the handler.
  cacheHandler: fileURLToPath(new URL('./lib/cache/page-cache-handler.cjs', import.meta.url)),
  cacheComponents: true,
  // Next 16.4 warns unless this is set. false keeps the prefetching we had on 16.3; turning it on
  // changes what every <Link> prefetches and needs its own review.
  partialPrefetching: false,
  experimental: {
    // Dev-only instant-navigation checks run only for segments that export `instant`. By default
    // any page or default segment without one turns them on for the whole route, and the empty
    // modal slot is in every route, so the ranking routes' `instant = false` was overridden.
    // The build's own check for uncached data outside Suspense is not affected.
    instantInsights: { validationLevel: 'manual-warning' },
  },
  // redefine the stock 'hours' profile in dev so its TTL = 0
  cacheLife: isDev ? { hours: { stale: 0, revalidate: 1, expire: 1 } } : undefined,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
    imageSizes: [16, 20, 24, 32, 40],
    minimumCacheTTL: 60 * 60 * 24,
    // Optimized images are kept on disk; without a cap Next allows them half the free disk space.
    // Past this, the least recently used ones are deleted and optimized again when asked for.
    maximumDiskCacheSize: 512 * 1024 * 1024,
  },
  skipTrailingSlashRedirect: true,
  typedRoutes: true,
  htmlLimitedBots,
  // satori/resvg load WASM/native binaries by filesystem path; bundling breaks that under Turbopack.
  serverExternalPackages: ['@resvg/resvg-js', 'satori', 'harfbuzzjs', 'yoga-wasm-web'],
  async headers() {
    return [
      // Next serves the app icons with max-age=0, so a shared cache asks the server again on every request. Pages link
      // them with a content hash in the query, so a changed icon gets a new URL.
      ...['/favicon.ico', '/icon.svg', '/apple-icon.png'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=604800' }],
      })),
      // The page for maintainers opts repos out with a click: no other site may frame it.
      ...['/contribute/maintainers', '/contribute/maintainers/'].map((source) => ({
        source,
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      })),
    ];
  },
  async redirects() {
    return [
      // A ranking without a page number opens its first page. Unknown types fall through to a 404.
      {
        source: '/by/:rankingType(stars|contributions|followers)',
        destination: '/by/:rankingType/1',
        permanent: false,
      },
      // Legacy sitemap locations. The old `app/**/sitemap.ts` routes answered on every
      // dynamic segment, not just the `_` placeholder advertised in robots.txt, so match
      // any segment — crawlers may have discovered `/by/stars/sitemap.xml` and friends.
      { source: '/profile/:login/sitemap.xml', destination: '/sitemaps/profiles/sitemap.xml', permanent: true },
      { source: '/by/:rankingType/sitemap.xml', destination: '/sitemaps/rankings/sitemap.xml', permanent: true },
      { source: '/country/sitemap.xml', destination: '/sitemaps/countries/sitemap.xml', permanent: true },
      { source: '/language/sitemap.xml', destination: '/sitemaps/languages/sitemap.xml', permanent: true },
      { source: '/orgs/sitemap.xml', destination: '/sitemaps/orgs/sitemap.xml', permanent: true },
    ];
  },
};

export default nextConfig;
