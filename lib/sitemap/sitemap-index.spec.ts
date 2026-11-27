import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPackageSitemapParts, fetchRepoTabSitemapParts } from './package-sitemap-data';
import {
  buildSitemapIndexXml,
  listChildSitemapLocs,
  listPackageSitemapLocs,
  sitemapIndexResponse,
} from './sitemap-index';
import { fetchOrgSitemapParts } from '@/graphql/helpers/fetch-org-sitemap-parts';
import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';
import { PackageRegistry, RepoSitemapTab } from '@/types/generated/graphql';

vi.mock('@/graphql/helpers/fetch-repo-sitemap-parts', () => ({ fetchRepoSitemapParts: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-org-sitemap-parts', () => ({ fetchOrgSitemapParts: vi.fn() }));
vi.mock('./package-sitemap-data', () => ({ fetchPackageSitemapParts: vi.fn(), fetchRepoTabSitemapParts: vi.fn() }));

const paths = (locs: string[]) => locs.map((loc) => new URL(loc).pathname);

describe('sitemap index', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoSitemapParts).mockReset();
    vi.mocked(fetchOrgSitemapParts).mockReset().mockResolvedValue(0);
    vi.mocked(fetchPackageSitemapParts).mockReset().mockResolvedValue(0);
    vi.mocked(fetchRepoTabSitemapParts).mockReset().mockResolvedValue(0);
  });

  it('lists the fixed segments, then one file per repository part', () => {
    const locs = paths(listChildSitemapLocs(2));

    expect(locs[0]).toBe('/sitemaps/static/sitemap.xml');
    expect(locs.slice(-6)).toEqual([
      '/sitemaps/insights/sitemap.xml',
      '/sitemaps/learn/sitemap.xml',
      '/sitemaps/contribute-prs/sitemap.xml',
      '/sitemaps/skills/sitemap.xml',
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
    expect(paths(listChildSitemapLocs(0, 2)).slice(-6)).toEqual([
      '/sitemaps/insights/sitemap.xml',
      '/sitemaps/learn/sitemap.xml',
      '/sitemaps/contribute-prs/sitemap.xml',
      '/sitemaps/skills/sitemap.xml',
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

  it("lists Interviews' sitemap only once Interviews is open to everyone", () => {
    expect(paths(listChildSitemapLocs(2, 1))).not.toContain('/sitemaps/interviews/sitemap.xml');
    expect(paths(listChildSitemapLocs(2, 1, false))).not.toContain('/sitemaps/interviews/sitemap.xml');
    const open = paths(listChildSitemapLocs(2, 1, true));
    expect(open).toContain('/sitemaps/interviews/sitemap.xml');
    expect(open.indexOf('/sitemaps/interviews/sitemap.xml')).toBeLessThan(
      open.indexOf('/sitemaps/repos/sitemap/0.xml'),
    );
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

  it('lists the package rankings, then the package-page parts and each repository tab parts', () => {
    expect(paths(listPackageSitemapLocs(2, 1, 2))).toEqual([
      '/sitemaps/packages/rankings/sitemap.xml',
      '/sitemaps/packages/sitemap/0.xml',
      '/sitemaps/packages/sitemap/1.xml',
      '/sitemaps/repo-used-by/sitemap/0.xml',
      '/sitemaps/repo-contributors/sitemap/0.xml',
      '/sitemaps/repo-contributors/sitemap/1.xml',
    ]);
    expect(paths(listPackageSitemapLocs(0, 0, 0))).toEqual(['/sitemaps/packages/rankings/sitemap.xml']);
    expect(paths(listPackageSitemapLocs(99, -1, 99)).filter((loc) => loc.includes('/sitemap/'))).toHaveLength(20);
  });

  it('pins the index XML', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-18T12:00:00Z'), toFake: ['Date'] });
    vi.mocked(fetchRepoSitemapParts).mockResolvedValue(1);
    vi.mocked(fetchPackageSitemapParts).mockResolvedValue(2);
    vi.mocked(fetchRepoTabSitemapParts).mockResolvedValue(1);

    const xml = await (await sitemapIndexResponse()).text();
    vi.useRealTimers();

    expect(xml.slice(xml.indexOf('/sitemaps/repos/sitemap/0.xml'))).toMatchInlineSnapshot(`
      "/sitemaps/repos/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/rankings/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/1.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/10.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/11.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/20.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/21.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/30.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/31.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/40.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/41.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/50.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/51.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/60.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/61.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/70.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/71.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/80.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/packages/sitemap/81.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/repo-used-by/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/repo-contributors/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
      </sitemapindex>
      "
    `);
  });

  it('lists the package sitemaps after the others', async () => {
    vi.mocked(fetchRepoSitemapParts).mockResolvedValue(1);
    vi.mocked(fetchPackageSitemapParts).mockResolvedValue(1);
    vi.mocked(fetchRepoTabSitemapParts).mockImplementation(async (tab) => (tab === RepoSitemapTab.UsedBy ? 2 : 1));

    const response = await sitemapIndexResponse();
    const locs = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);

    expect(locs.slice(-14)).toEqual([
      '/sitemaps/repos/sitemap/0.xml',
      '/sitemaps/packages/rankings/sitemap.xml',
      '/sitemaps/packages/sitemap/0.xml',
      '/sitemaps/packages/sitemap/10.xml',
      '/sitemaps/packages/sitemap/20.xml',
      '/sitemaps/packages/sitemap/30.xml',
      '/sitemaps/packages/sitemap/40.xml',
      '/sitemaps/packages/sitemap/50.xml',
      '/sitemaps/packages/sitemap/60.xml',
      '/sitemaps/packages/sitemap/70.xml',
      '/sitemaps/packages/sitemap/80.xml',
      '/sitemaps/repo-used-by/sitemap/0.xml',
      '/sitemaps/repo-used-by/sitemap/1.xml',
      '/sitemaps/repo-contributors/sitemap/0.xml',
    ]);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Npm);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Pypi);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Go);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Crates);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Pub);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Packagist);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Maven);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Nuget);
    expect(fetchPackageSitemapParts).toHaveBeenCalledWith(PackageRegistry.Rubygems);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600');
  });
});
