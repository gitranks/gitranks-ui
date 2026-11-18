import { beforeEach, describe, expect, it, vi } from 'vitest';

import { repoTabSitemap, repoTabSitemapParts } from './repo-tab-sitemap';
import contributorsSitemap from '@/app/sitemaps/repo-contributors/sitemap';
import usedBySitemap from '@/app/sitemaps/repo-used-by/sitemap';
import { fetchRepoTabsForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';
import { RepoSitemapTab } from '@/types/generated/graphql';

vi.mock('@/lib/sitemap/package-sitemap-data', () => ({ fetchRepoTabsForSitemap: vi.fn() }));
vi.mock('@/lib/sitemap/packages-public', () => ({ notFoundUnlessPackagesPublic: vi.fn() }));

const urls = async (entries: Promise<{ url: string }[]>) => (await entries).map(({ url }) => url);

describe('repository tab sitemaps', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoTabsForSitemap).mockReset().mockResolvedValue(['vercel/next.js']);
    vi.mocked(notFoundUnlessPackagesPublic).mockReset().mockResolvedValue(undefined);
  });

  it('has ten parts a tab', () => {
    expect(repoTabSitemapParts()).toHaveLength(10);
  });

  it("lists each repository's Used by tab", async () => {
    expect(await urls(usedBySitemap({ id: Promise.resolve('2') }))).toEqual([
      'https://example.test/repo/vercel/next.js/used-by',
    ]);
    expect(fetchRepoTabsForSitemap).toHaveBeenCalledWith(RepoSitemapTab.UsedBy, 2);
  });

  it("lists each repository's Contributors tab", async () => {
    expect(await urls(contributorsSitemap({ id: Promise.resolve('0') }))).toEqual([
      'https://example.test/repo/vercel/next.js/contributors',
    ]);
    expect(fetchRepoTabsForSitemap).toHaveBeenCalledWith(RepoSitemapTab.Contributors, 0);
  });

  it('answers 404 before reading anything while package pages are not open to everyone', async () => {
    vi.mocked(notFoundUnlessPackagesPublic).mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'));

    await expect(repoTabSitemap(RepoSitemapTab.UsedBy, Promise.resolve('0'))).rejects.toThrow('404');
    expect(fetchRepoTabsForSitemap).not.toHaveBeenCalled();
  });

  it('reads no part outside 0–9', async () => {
    expect(await repoTabSitemap(RepoSitemapTab.UsedBy, Promise.resolve('10'))).toEqual([]);
    expect(fetchRepoTabsForSitemap).not.toHaveBeenCalled();
  });
});
