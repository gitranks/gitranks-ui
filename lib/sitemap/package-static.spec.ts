import { describe, expect, it, vi } from 'vitest';

import staticSitemap from '@/app/sitemaps/static/sitemap';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

/** The static sitemap's entries before the package pages. */
const BEFORE = [
  { url: 'https://example.test/', changeFrequency: 'monthly', priority: 1 },
  { url: 'https://example.test/countries/stars/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/contributions/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/followers/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/users/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/insights', changeFrequency: 'monthly', priority: 0.7 },
  { url: 'https://example.test/badge/gallery', changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://example.test/badge/builder', changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://example.test/methodology', changeFrequency: 'monthly', priority: 0.6 },
  { url: 'https://example.test/terms', changeFrequency: 'monthly', priority: 0.2 },
  { url: 'https://example.test/privacy', changeFrequency: 'monthly', priority: 0.2 },
];

describe('the static sitemap, the Unsung heroes archive and how package rankings work', () => {
  it('lists the archive and the package methodology after everything else', () => {
    expect(staticSitemap()).toEqual([
      ...BEFORE,
      { url: 'https://example.test/unsung-heroes', changeFrequency: 'weekly', priority: 0.6 },
      { url: 'https://example.test/methodology/packages', changeFrequency: 'monthly', priority: 0.6 },
    ]);
  });
});
