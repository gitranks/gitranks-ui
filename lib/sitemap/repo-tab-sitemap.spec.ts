import { beforeEach, describe, expect, it, vi } from 'vitest';

import { repoTabSitemap, repoTabSitemapParts } from './repo-tab-sitemap';
import contributorsSitemap from '@/app/sitemaps/repo-contributors/sitemap';
import usedBySitemap from '@/app/sitemaps/repo-used-by/sitemap';
import { fetchRepoTabsForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { RepoSitemapTab } from '@/types/generated/graphql';

vi.mock('@/lib/sitemap/package-sitemap-data', () => ({ fetchRepoTabsForSitemap: vi.fn() }));

const urls = async (entries: Promise<{ url: string }[]>) => (await entries).map(({ url }) => url);

describe('repository tab sitemaps', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoTabsForSitemap).mockReset().mockResolvedValue(['vercel/next.js']);
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

  it('reads no part outside 0–9', async () => {
    expect(await repoTabSitemap(RepoSitemapTab.UsedBy, Promise.resolve('10'))).toEqual([]);
    expect(fetchRepoTabsForSitemap).not.toHaveBeenCalled();
  });
});
