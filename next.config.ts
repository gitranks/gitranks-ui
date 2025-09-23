import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    useCache: true,
    cacheComponents: true,
    // redefine the stock 'hours' profile in dev so its TTL = 0
    cacheLife: isDev ? { hours: { stale: 0, revalidate: 1, expire: 1 } } : undefined,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
    imageSizes: [16, 20, 24, 32, 40],
    minimumCacheTTL: 60 * 60 * 24,
  },
  skipTrailingSlashRedirect: true,
  typedRoutes: true,
};

export default nextConfig;
