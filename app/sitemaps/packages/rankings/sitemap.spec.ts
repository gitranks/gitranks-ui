import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';
import { PackageRegistry } from '@/types/generated/graphql';

vi.mock('@/graphql/helpers/fetch-package-rankings', () => ({ fetchPackageRankingFacts: vi.fn() }));

const facts = (ranked: number) => ({ ranked, dependentsReadAt: null, downloadsThrough: null, ranksAt: null });
const paths = async () => (await sitemap()).map(({ url }) => new URL(url).pathname);

describe('package rankings sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchPackageRankingFacts).mockReset();
  });

  it("lists each registry's three rankings to the pages its ranked packages fill", async () => {
    vi.mocked(fetchPackageRankingFacts).mockImplementation(async (registry) =>
      registry === PackageRegistry.Npm
        ? facts(150)
        : registry === PackageRegistry.Pypi || registry === PackageRegistry.Go
          ? facts(40)
          : null,
    );

    expect(await paths()).toEqual([
      '/packages/npm/downloads/1',
      '/packages/npm/dependents-stars/1',
      '/packages/npm/dependents/1',
      '/packages/npm/downloads/2',
      '/packages/npm/dependents-stars/2',
      '/packages/npm/dependents/2',
      '/packages/pypi/downloads/1',
      '/packages/pypi/dependents-stars/1',
      '/packages/pypi/dependents/1',
      // Go publishes no download counts: no downloads ranking.
      '/packages/go/dependents-stars/1',
      '/packages/go/dependents/1',
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
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/downloads/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/downloads/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pypi/dependents/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/go/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/go/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/go/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/go/dependents/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/downloads/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/downloads/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/crates/dependents/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/downloads/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/downloads/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/pub/dependents/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/downloads/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/downloads/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/packagist/dependents/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/maven/dependents-stars/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/maven/dependents/1",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/maven/dependents-stars/2",
        },
        {
          "changeFrequency": "monthly",
          "priority": 0.9,
          "url": "https://example.test/packages/maven/dependents/2",
        },
      ]
    `);
  });

  it('stops at 50 pages a ranking', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(facts(1_000_000));

    const all = await paths();

    // Three rankings on each of the five registries with download counts, two on Go and Maven Central.
    expect(all).toHaveLength(50 * (3 * 5 + 2 * 2));
    expect(all.at(149)).toBe('/packages/npm/dependents/50');
    expect(all.at(-1)).toBe('/packages/maven/dependents/50');
    expect(all.filter((path) => path.startsWith('/packages/maven/downloads/'))).toEqual([]);
  });

  it('lists no page before the first ranks, or when they cannot be read', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(null);
    expect(await paths()).toEqual([]);

    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(undefined);
    expect(await paths()).toEqual([]);
  });
});
