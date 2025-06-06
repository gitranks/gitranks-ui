import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    useCache: true,
    dynamicIO: true,
    // redefine the stock 'hours' profile in dev so its TTL = 0
    // cacheLife: isDev ? { hours: { stale: 0, revalidate: 1, expire: 1 } } : undefined,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://eu.i.posthog.com/decide',
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
