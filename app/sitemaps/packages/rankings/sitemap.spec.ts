import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';
import { notFoundUnlessPackagesPublic } from '@/lib/sitemap/packages-public';

vi.mock('@/graphql/helpers/fetch-package-rankings', () => ({ fetchPackageRankingFacts: vi.fn() }));
vi.mock('@/lib/sitemap/packages-public', () => ({ notFoundUnlessPackagesPublic: vi.fn() }));

const facts = (ranked: number) => ({ ranked, dependentsReadAt: null, downloadsThrough: null, ranksAt: null });
const paths = async () => (await sitemap()).map(({ url }) => new URL(url).pathname);

describe('package rankings sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchPackageRankingFacts).mockReset();
    vi.mocked(notFoundUnlessPackagesPublic).mockReset().mockResolvedValue(undefined);
  });

  it('lists the three rankings to the pages the ranked packages fill', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(facts(150));

    expect(await paths()).toEqual([
      '/packages/npm/downloads/1',
      '/packages/npm/dependents-stars/1',
      '/packages/npm/dependents/1',
      '/packages/npm/downloads/2',
      '/packages/npm/dependents-stars/2',
      '/packages/npm/dependents/2',
    ]);
  });

  it('stops at 50 pages a ranking', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(facts(1_000_000));

    const all = await paths();

    expect(all).toHaveLength(150);
    expect(all.at(-1)).toBe('/packages/npm/dependents/50');
  });

  it('lists no page before the first ranks, or when they cannot be read', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(null);
    expect(await paths()).toEqual([]);

    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(undefined);
    expect(await paths()).toEqual([]);
  });

  it('answers 404 before reading anything while package pages are not open to everyone', async () => {
    vi.mocked(notFoundUnlessPackagesPublic).mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'));

    await expect(sitemap()).rejects.toThrow('404');
    expect(fetchPackageRankingFacts).not.toHaveBeenCalled();
  });
});
