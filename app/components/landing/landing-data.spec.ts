import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContributeOpenDocument } from '@/lib/contribute/contribute.documents';
import { RepoRankingsDocument } from '@/types/generated/graphql';

const { graphqlDirect, cacheLife } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), cacheLife: vi.fn() }));

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/graphql/helpers/fetch-insights-server', () => ({ fetchInsightsServer: vi.fn() }));

const { fetchContributeOpen, fetchTopRepos } = await import('./landing-data');

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

describe('fetchContributeOpen', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheLife.mockReset();
  });

  it('is open only when the API says true, kept as long as the insights', async () => {
    graphqlDirect.mockResolvedValueOnce({ contributeOpen: true });

    await expect(fetchContributeOpen()).resolves.toBe(true);
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeOpenDocument);
    expect(cacheLife).toHaveBeenCalledWith(expect.objectContaining({ revalidate: 900 }));
  });

  it.each([
    ['false', { contributeOpen: false }],
    ['null', { contributeOpen: null }],
    ['no answer', null],
  ])('is closed on %s', async (_, answer) => {
    graphqlDirect.mockResolvedValueOnce(answer);

    await expect(fetchContributeOpen()).resolves.toBe(false);
  });

  it('is closed when the read fails, an API without the flag included', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "contributeOpen" on type "Query".'));

    await expect(fetchContributeOpen()).resolves.toBe(false);
  });
});
