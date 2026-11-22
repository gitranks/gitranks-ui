import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageRankingType, PackageRegistry, RepoRankingsDocument } from '@/types/generated/graphql';

const { graphqlDirect, cacheLife, fetchPackageRankings, fetchPackageRankingFacts } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  fetchPackageRankings: vi.fn(),
  fetchPackageRankingFacts: vi.fn(),
}));

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/graphql/helpers/fetch-insights-server', () => ({ fetchInsightsServer: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-package-rankings', () => ({ fetchPackageRankings, fetchPackageRankingFacts }));

const { fetchLandingPackages, fetchTopRepos } = await import('./landing-data');

describe('fetchTopRepos', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheLife.mockReset();
  });

  it('reads the first page of the repository ranking for an hour', async () => {
    const rows = [{ githubId: 'R_1', s: 1 }];
    graphqlDirect.mockResolvedValueOnce({ repoRankings: rows });

    await expect(fetchTopRepos()).resolves.toBe(rows);
    expect(graphqlDirect).toHaveBeenCalledWith(RepoRankingsDocument, { offset: 0 });
    expect(cacheLife).toHaveBeenCalledTimes(1);
    expect(cacheLife).toHaveBeenCalledWith(expect.objectContaining({ revalidate: 3_600 }));
  });

  it('gives an empty list when there is no answer', async () => {
    graphqlDirect.mockResolvedValueOnce(null);

    await expect(fetchTopRepos()).resolves.toEqual([]);
  });

  it('gives an empty list, kept for minutes, when the read fails', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));

    await expect(fetchTopRepos()).resolves.toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });
});

describe('fetchLandingPackages', () => {
  const row = (rank: number) => ({ rank, name: `pkg-${rank}`, value: 100 - rank });
  const page = Array.from({ length: 10 }, (_, index) => row(index + 1));

  beforeEach(() => {
    fetchPackageRankings.mockReset();
    fetchPackageRankingFacts.mockReset();
  });

  it("reads the first page of each npm ranking, keeps its top five, with the facts' count and day", async () => {
    fetchPackageRankings.mockResolvedValue(page);
    fetchPackageRankingFacts.mockResolvedValue({ ranked: 110_548, downloadsThrough: '2026-11-18T00:00:00.000Z' });

    const got = await fetchLandingPackages();

    expect(fetchPackageRankingFacts).toHaveBeenCalledWith(PackageRegistry.Npm);
    expect(fetchPackageRankings.mock.calls.map(([props]) => props)).toEqual([
      { registry: PackageRegistry.Npm, by: PackageRankingType.Downloads, offset: 0 },
      { registry: PackageRegistry.Npm, by: PackageRankingType.DependentsStars, offset: 0 },
      { registry: PackageRegistry.Npm, by: PackageRankingType.Dependents, offset: 0 },
    ]);
    expect(got?.boards.map(({ order }) => order)).toEqual(['downloads', 'dependents-stars', 'dependents']);
    expect(got?.boards.every(({ rows }) => rows.length === 5)).toBe(true);
    expect(got?.ranked).toBe(110_548);
    expect(got?.downloadsTo).toBe('November 18, 2026');
  });

  it('leaves out a ranking that cannot be read now or has no rows', async () => {
    fetchPackageRankings.mockResolvedValueOnce(undefined).mockResolvedValueOnce([]).mockResolvedValueOnce(page);
    fetchPackageRankingFacts.mockResolvedValue(undefined);

    const got = await fetchLandingPackages();

    expect(got?.boards.map(({ order }) => order)).toEqual(['dependents']);
    expect(got?.ranked).toBeNull();
    expect(got?.downloadsTo).toBeNull();
  });

  it('gives null when no ranking can be read', async () => {
    fetchPackageRankings.mockResolvedValue(undefined);
    fetchPackageRankingFacts.mockResolvedValue(null);

    await expect(fetchLandingPackages()).resolves.toBeNull();
  });
});
