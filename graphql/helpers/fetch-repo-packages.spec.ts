import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { threePackages } from '@/components/dependents/dependents.fixtures';

const graphqlDirect = vi.fn();
const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));

const { fetchRepoPackages, fetchRepoUsedBy, isPackagesUnavailable, UNAVAILABLE } = await import(
  './fetch-repo-packages'
);

/** The request helper's error for an answer with GraphQL errors. */
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'x', path: ['repo'], extensions: { code } }]));

const QUERY = { offset: 25, limit: 25, package: '@nebula/ui', hideArchived: true };

describe('fetchRepoPackages and fetchRepoUsedBy', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keep a repository's packages for hours under its cache tag, read as the site with no viewer", async () => {
    graphqlDirect.mockResolvedValue({ repo: { packages: threePackages } });

    await expect(fetchRepoPackages('Nebula', 'UI')).resolves.toEqual(threePackages);
    expect(graphqlDirect).toHaveBeenCalledExactlyOnceWith(expect.anything(), { owner: 'nebula', name: 'ui' });
    expect(cacheTag).toHaveBeenCalledWith('repo:nebula/ui');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('leave out a package on a registry the site does not list, and out of the count', async () => {
    const other = { ...threePackages.items[0], registry: 'PYPI', name: 'nebula-ui' };
    graphqlDirect.mockResolvedValue({
      repo: { packages: { ...threePackages, total: 4, items: [...threePackages.items, other] } },
    });
    await expect(fetchRepoPackages('nebula', 'ui')).resolves.toEqual({ ...threePackages, total: 3 });

    graphqlDirect.mockResolvedValue({ repo: { packages: { ...threePackages, total: 1, items: [other] } } });
    await expect(fetchRepoPackages('nebula', 'ui-only-other')).resolves.toBeNull();
  });

  it('read a repository that publishes nothing as null', async () => {
    graphqlDirect.mockResolvedValueOnce({ repo: { packages: null } });
    await expect(fetchRepoPackages('a', 'b')).resolves.toBeNull();

    graphqlDirect.mockResolvedValueOnce({ repo: { packages: { ...threePackages, total: 0, items: [] } } });
    await expect(fetchRepoPackages('a', 'b')).resolves.toBeNull();

    graphqlDirect.mockResolvedValueOnce({ repo: null });
    await expect(fetchRepoUsedBy('a', 'b', QUERY)).resolves.toBeNull();
  });

  it('pass the page asked for', async () => {
    graphqlDirect.mockResolvedValue({ repo: { usedBy: { total: 0, archived: 0, items: [] } } });

    await fetchRepoUsedBy('Nebula', 'ui', QUERY);
    expect(graphqlDirect).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      owner: 'nebula',
      name: 'ui',
      offset: 25,
      limit: 25,
      package: '@nebula/ui',
      hideArchived: true,
    });
  });

  it('turn package data the API could not read into "unavailable", kept for minutes', async () => {
    graphqlDirect.mockRejectedValue(apiError('PACKAGES_UNAVAILABLE'));

    await expect(fetchRepoPackages('a', 'b')).resolves.toBe(UNAVAILABLE);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    await expect(fetchRepoUsedBy('a', 'b', QUERY)).resolves.toBe(UNAVAILABLE);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });

  it('let any other failure through', async () => {
    graphqlDirect.mockRejectedValue(apiError('GRAPHQL_VALIDATION_FAILED'));

    await expect(fetchRepoPackages('a', 'b')).rejects.toThrow('GRAPHQL_VALIDATION_FAILED');
    expect(isPackagesUnavailable(new Error('GraphQL error! 502: Bad Gateway'))).toBe(false);
  });

  it('ask the API nothing during the build: its render is kept for minutes as one without package data', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');

    await expect(fetchRepoPackages('torvalds', 'linux')).resolves.toBe(UNAVAILABLE);
    await expect(fetchRepoUsedBy('torvalds', 'linux', QUERY)).resolves.toBe(UNAVAILABLE);
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });
});
