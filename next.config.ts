import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  // redefine the stock 'hours' profile in dev so its TTL = 0
  cacheLife: isDev ? { hours: { stale: 0, revalidate: 1, expire: 1 } } : undefined,
  experimental: {
    useCache: true,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
    imageSizes: [16, 20, 24, 32, 40],
    minimumCacheTTL: 60 * 60 * 24,
  },
  skipTrailingSlashRedirect: true,
  typedRoutes: true,
  // satori/resvg load WASM/native binaries by filesystem path; bundling breaks that under Turbopack.
  serverExternalPackages: ['@resvg/resvg-js', 'satori', 'harfbuzzjs', 'yoga-wasm-web'],
  async redirects() {
    return [
      // Legacy sitemap locations (dummy dynamic segments / old paths)
      { source: '/profile/_/sitemap.xml', destination: '/sitemaps/profiles/sitemap.xml', permanent: true },
      { source: '/by/_/sitemap.xml', destination: '/sitemaps/rankings/sitemap.xml', permanent: true },
      { source: '/country/sitemap.xml', destination: '/sitemaps/countries/sitemap.xml', permanent: true },
      { source: '/language/sitemap.xml', destination: '/sitemaps/languages/sitemap.xml', permanent: true },
      { source: '/orgs/sitemap.xml', destination: '/sitemaps/orgs/sitemap.xml', permanent: true },
    ];
  },
};

export default nextConfig;
