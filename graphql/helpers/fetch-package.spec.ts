import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dependentRows, notReadPackage, rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';

const graphqlDirect = vi.fn();
const cacheLife = vi.fn();
const cacheTag = vi.fn();
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));

const { fetchPackage, fetchPackageDependents, PACKAGE_UNAVAILABLE } = await import('./fetch-package');

/** The request helper's error for an answer with GraphQL errors. */
const apiError = (code: string) =>
  new Error(JSON.stringify([{ message: 'x', path: ['package'], extensions: { code } }]));

describe('fetchPackage and fetchPackageDependents', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('keep a package for hours under its cache tag, read as the site with no viewer, by its exact name', async () => {
    graphqlDirect.mockResolvedValue({ package: rankedPackage });

    await expect(fetchPackage('npm', '@Nebula/UI')).resolves.toEqual(rankedPackage);
    expect(graphqlDirect).toHaveBeenCalledExactlyOnceWith(expect.anything(), {
      registry: 'NPM',
      name: '@Nebula/UI',
      limit: 25,
    });
    expect(cacheTag).toHaveBeenCalledWith('package:npm/@nebula/ui');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('keep a package not read yet, or one being refreshed, for minutes; a name the registry lacks is null', async () => {
    graphqlDirect.mockResolvedValueOnce({ package: notReadPackage });
    await expect(fetchPackage('npm', 'left-pad-next')).resolves.toEqual(notReadPackage);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockResolvedValueOnce({ package: { ...rankedPackage, refreshRunning: true } });
    await fetchPackage('npm', 'react-resize-detector');
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockResolvedValueOnce({ package: null });
    await expect(fetchPackage('npm', 'gone')).resolves.toBeNull();
  });

  it('read no package data now as "unavailable", kept for minutes, and throw any other failure', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('PACKAGES_UNAVAILABLE'));
    await expect(fetchPackage('npm', 'react')).resolves.toBe(PACKAGE_UNAVAILABLE);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockRejectedValueOnce(apiError('PACKAGES_UNAVAILABLE'));
    await expect(fetchPackageDependents('npm', 'react', { offset: 0, hideArchived: false })).resolves.toBe(
      PACKAGE_UNAVAILABLE,
    );

    graphqlDirect.mockRejectedValueOnce(apiError('INTERNAL_SERVER_ERROR'));
    await expect(fetchPackage('npm', 'react')).rejects.toThrow();
  });

  it('read a page of dependents, and nothing during the build', async () => {
    const page = { total: 16, archived: 1, items: dependentRows };
    graphqlDirect.mockResolvedValueOnce({ package: { dependents: page } });
    await expect(fetchPackageDependents('npm', 'react', { offset: 25, hideArchived: true })).resolves.toEqual(page);
    expect(graphqlDirect).toHaveBeenLastCalledWith(expect.anything(), {
      registry: 'NPM',
      name: 'react',
      offset: 25,
      limit: 25,
      hideArchived: true,
    });

    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await expect(fetchPackage('npm', 'react')).resolves.toBe(PACKAGE_UNAVAILABLE);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});
