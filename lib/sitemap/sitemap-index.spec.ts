import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSitemapIndexXml, listChildSitemapLocs, sitemapIndexResponse } from './sitemap-index';
import { fetchOrgSitemapParts } from '@/graphql/helpers/fetch-org-sitemap-parts';
import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';

vi.mock('@/graphql/helpers/fetch-repo-sitemap-parts', () => ({ fetchRepoSitemapParts: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-org-sitemap-parts', () => ({ fetchOrgSitemapParts: vi.fn() }));

const paths = (locs: string[]) => locs.map((loc) => new URL(loc).pathname);

describe('sitemap index', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoSitemapParts).mockReset();
    vi.mocked(fetchOrgSitemapParts).mockReset().mockResolvedValue(0);
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

  it('lists the organization-page parts after the repository parts', () => {
    expect(paths(listChildSitemapLocs(2, 1)).slice(-3)).toEqual([
      '/sitemaps/repos/sitemap/0.xml',
      '/sitemaps/repos/sitemap/1.xml',
      '/sitemaps/orgs/pages/sitemap/0.xml',
    ]);
    expect(paths(listChildSitemapLocs(0, 2)).slice(-3)).toEqual([
      '/sitemaps/insights/sitemap.xml',
      '/sitemaps/orgs/pages/sitemap/0.xml',
      '/sitemaps/orgs/pages/sitemap/1.xml',
    ]);
  });

  it('keeps the organization rankings sitemap beside the organization-page parts', () => {
    expect(paths(listChildSitemapLocs(0, 1))).toContain('/sitemaps/orgs/sitemap.xml');
  });

  it('lists no organization-page part for none, and at most the parts that exist', () => {
    expect(paths(listChildSitemapLocs(1, 0)).some((loc) => loc.startsWith('/sitemaps/orgs/pages'))).toBe(false);
    expect(paths(listChildSitemapLocs(0, -1)).some((loc) => loc.startsWith('/sitemaps/orgs/pages'))).toBe(false);
    expect(paths(listChildSitemapLocs(0, 99)).filter((loc) => loc.startsWith('/sitemaps/orgs/pages'))).toHaveLength(5);
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
    expect(xml).not.toContain('/sitemaps/orgs/pages/');
  });

  it('answers with the organization-page parts the count reports', async () => {
    vi.mocked(fetchRepoSitemapParts).mockResolvedValue(2);
    vi.mocked(fetchOrgSitemapParts).mockResolvedValue(1);

    const xml = await (await sitemapIndexResponse()).text();

    expect(xml).toContain('/sitemaps/repos/sitemap/1.xml');
    expect(xml).toContain('/sitemaps/orgs/pages/sitemap/0.xml');
    expect(xml).not.toContain('/sitemaps/orgs/pages/sitemap/1.xml');
  });
});
