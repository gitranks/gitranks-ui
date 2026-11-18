import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchPackageRankingFacts, fetchPackageRankings } from './fetch-package-rankings';
import { downloadsRanking, packageRankingFacts } from '@/app/packages/__fixtures__/package-rankings';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PackageRankingType, PackageRegistry } from '@/types/generated/graphql';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const ASK = { registry: PackageRegistry.Npm, by: PackageRankingType.Downloads, offset: 0 };

describe('fetchPackageRankings', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(graphqlDirect).mockReset();
  });

  it('answers the rows, kept for hours', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({ packageRankings: downloadsRanking });

    await expect(fetchPackageRankings(ASK)).resolves.toBe(downloadsRanking);
    expect(vi.mocked(graphqlDirect).mock.calls[0][1]).toEqual(ASK);
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours']]);
  });

  it('keeps an empty page as an answer', async () => {
    vi.mocked(graphqlDirect).mockResolvedValue({ packageRankings: [] });

    await expect(fetchPackageRankings(ASK)).resolves.toEqual([]);
  });

  it('answers undefined for minutes, never throwing, when the API refuses the field or does not answer', async () => {
    vi.mocked(graphqlDirect).mockRejectedValueOnce(
      new Error('[{"message":"Cannot query field \\"packageRankings\\" on type \\"Query\\"."}]'),
    );
    await expect(fetchPackageRankings(ASK)).resolves.toBeUndefined();

    vi.mocked(graphqlDirect).mockResolvedValueOnce({ packageRankings: null });
    await expect(fetchPackageRankings(ASK)).resolves.toBeUndefined();

    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes'], ['minutes']]);
  });
});

describe('fetchPackageRankingFacts', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(graphqlDirect).mockReset();
  });

  it('answers the facts, or null before the first ranks, kept for hours', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce({ packageRankingFacts });
    await expect(fetchPackageRankingFacts(PackageRegistry.Npm)).resolves.toBe(packageRankingFacts);

    vi.mocked(graphqlDirect).mockResolvedValueOnce({ packageRankingFacts: null });
    await expect(fetchPackageRankingFacts(PackageRegistry.Npm)).resolves.toBeNull();

    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours'], ['hours']]);
  });

  it('answers undefined for minutes when the read fails', async () => {
    vi.mocked(graphqlDirect).mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));

    await expect(fetchPackageRankingFacts(PackageRegistry.Npm)).resolves.toBeUndefined();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });
});
