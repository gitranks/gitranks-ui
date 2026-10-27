import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSitemapIndexXml, listChildSitemapLocs, sitemapIndexResponse } from './sitemap-index';
import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';

vi.mock('@/graphql/helpers/fetch-repo-sitemap-parts', () => ({ fetchRepoSitemapParts: vi.fn() }));

const paths = (locs: string[]) => locs.map((loc) => new URL(loc).pathname);

describe('sitemap index', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoSitemapParts).mockReset();
  });

  it('lists the fixed segments, then one file per repository part', () => {
    const locs = paths(listChildSitemapLocs(2));

    expect(locs[0]).toBe('/sitemaps/static/sitemap.xml');
    expect(locs.slice(-3)).toEqual([
      '/sitemaps/insights/sitemap.xml',
      '/sitemaps/repos/sitemap/0.xml',
      '/sitemaps/repos/sitemap/1.xml',
    ]);
  });

  it('lists no repository part for none, and at most the parts that exist', () => {
    expect(paths(listChildSitemapLocs(0)).some((loc) => loc.startsWith('/sitemaps/repos'))).toBe(false);
    expect(paths(listChildSitemapLocs(99)).filter((loc) => loc.startsWith('/sitemaps/repos'))).toHaveLength(10);
  });

  it('writes one entry per loc with the month as lastmod', () => {
    const xml = buildSitemapIndexXml(['https://example.test/a.xml'], new Date('2026-10-01T00:00:00.000Z'));

    expect(xml).toContain('<loc>https://example.test/a.xml</loc>');
    expect(xml).toContain('<lastmod>2026-10-01T00:00:00.000Z</lastmod>');
  });

  it('answers with the repository parts the count reports', async () => {
    vi.mocked(fetchRepoSitemapParts).mockResolvedValue(1);

    const xml = await (await sitemapIndexResponse()).text();

    expect(xml).toContain('/sitemaps/repos/sitemap/0.xml');
    expect(xml).not.toContain('/sitemaps/repos/sitemap/1.xml');
  });
});
