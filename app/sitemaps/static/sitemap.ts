import type { MetadataRoute } from 'next';

import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    sitemapEntry('/', { priority: 1 }),
    sitemapEntry('/countries/stars/1', { priority: 0.9 }),
    sitemapEntry('/countries/contributions/1', { priority: 0.9 }),
    sitemapEntry('/countries/followers/1', { priority: 0.9 }),
    sitemapEntry('/countries/users/1', { priority: 0.9 }),
    sitemapEntry('/insights', { priority: 0.7 }),
    sitemapEntry('/badge/gallery', { priority: 0.8 }),
    sitemapEntry('/badge/builder', { priority: 0.8 }),
  ];
}
