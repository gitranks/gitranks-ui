import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';

vi.mock('@/graphql/helpers/fetch-package-rankings', () => ({ fetchPackageRankingFacts: vi.fn() }));

const facts = (ranked: number) => ({ ranked, dependentsReadAt: null, downloadsThrough: null, ranksAt: null });
const paths = async () => (await sitemap()).map(({ url }) => new URL(url).pathname);

describe('package rankings sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchPackageRankingFacts).mockReset();
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

  it('pins the entries of the first two pages', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(facts(150));

    expect(await sitemap()).toMatchInlineSnapshot(`
      [
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/downloads/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/downloads/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/npm/dependents/2",
        },
      ]
    `);
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
});
