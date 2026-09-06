import type { MetadataRoute } from 'next';

export function getSitemapBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_URI?.replace(/\/+$/, '');
  if (!base) {
    throw new Error('NEXT_PUBLIC_URI is required for sitemap generation');
  }
  return base;
}

export function absoluteSitemapUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getSitemapBaseUrl()}${normalized}`;
}

/** Page-depth priority rounded to 1 decimal (avoids float noise in XML). */
export function sitemapPagePriority(page: number, totalPages: number, max = 0.9, min = 0.4): number {
  if (totalPages <= 1) return max;
  const raw = max - ((page - 1) / (totalPages - 1)) * (max - min);
  return Math.round(raw * 10) / 10;
}

export function sitemapEntry(
  path: string,
  options: Omit<MetadataRoute.Sitemap[number], 'url'> = {},
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteSitemapUrl(path),
    changeFrequency: 'monthly',
    ...options,
  };
}
