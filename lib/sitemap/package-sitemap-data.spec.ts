import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchPackageSitemapParts,
  fetchPackagesForSitemap,
  fetchRepoTabSitemapParts,
  fetchRepoTabsForSitemap,
} from './package-sitemap-data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PackageRegistry, RepoSitemapTab } from '@/types/generated/graphql';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

describe('package sitemap reads', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(graphqlDirect).mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('keeps an answer for hours', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce({ packageSitemapParts: 2 });
    expect(await fetchPackageSitemapParts(PackageRegistry.Npm)).toBe(2);

    vi.mocked(graphqlDirect).mockResolvedValueOnce({ packagesForSitemap: ['react', '@types/node'] });
    expect(await fetchPackagesForSitemap(PackageRegistry.Npm, 1)).toEqual(['react', '@types/node']);
    expect(graphqlDirect).toHaveBeenLastCalledWith(expect.anything(), { registry: PackageRegistry.Npm, part: 1 });

    vi.mocked(graphqlDirect).mockResolvedValueOnce({ repoTabSitemapParts: 1 });
    expect(await fetchRepoTabSitemapParts(RepoSitemapTab.UsedBy)).toBe(1);

    vi.mocked(graphqlDirect).mockResolvedValueOnce({ repoTabsForSitemap: ['vercel/next.js'] });
    expect(await fetchRepoTabsForSitemap(RepoSitemapTab.Contributors, 0)).toEqual(['vercel/next.js']);
    expect(graphqlDirect).toHaveBeenLastCalledWith(expect.anything(), { tab: RepoSitemapTab.Contributors, part: 0 });

    expect(vi.mocked(cacheLife).mock.calls.flat()).toEqual(['hours', 'hours', 'hours', 'hours']);
  });

  it('reads no answer (hidden from the site) as nothing, kept for minutes', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({
      packageSitemapParts: null,
      packagesForSitemap: null,
      repoTabSitemapParts: null,
      repoTabsForSitemap: null,
    });

    expect(await fetchPackageSitemapParts(PackageRegistry.Npm)).toBe(0);
    expect(await fetchPackagesForSitemap(PackageRegistry.Npm, 0)).toEqual([]);
    expect(await fetchRepoTabSitemapParts(RepoSitemapTab.UsedBy)).toBe(0);
    expect(await fetchRepoTabsForSitemap(RepoSitemapTab.UsedBy, 0)).toEqual([]);
    expect(vi.mocked(cacheLife).mock.calls.flat()).toEqual(['minutes', 'minutes', 'minutes', 'minutes']);
  });

  it('reads an error as nothing, kept for minutes', async () => {
    vi.mocked(graphqlDirect).mockRejectedValue(new Error('unavailable'));

    expect(await fetchPackageSitemapParts(PackageRegistry.Npm)).toBe(0);
    expect(await fetchPackagesForSitemap(PackageRegistry.Npm, 0)).toEqual([]);
    expect(await fetchRepoTabSitemapParts(RepoSitemapTab.Contributors)).toBe(0);
    expect(await fetchRepoTabsForSitemap(RepoSitemapTab.Contributors, 0)).toEqual([]);
    expect(vi.mocked(cacheLife).mock.calls.flat()).toEqual(['minutes', 'minutes', 'minutes', 'minutes']);
  });
});
