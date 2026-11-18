import { cacheLife, cacheTag } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadBadgePackage, loadBadgePackageCard } from './load';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const read = (state: 'READ' | 'NOT_READ', name = 'React-Tools') => ({
  package: {
    registry: 'NPM',
    name,
    state,
    repo: null,
    repositoryName: null,
    downloads: null,
    dependentsCount: 0,
    dependentsStars: 0,
    dependents: null,
  },
});

const unavailable = () => new Error('[{"message":"down","extensions":{"code":"PACKAGES_UNAVAILABLE"}}]');

describe("a package's badge data", () => {
  beforeEach(() => {
    vi.mocked(graphqlDirect).mockReset();
    vi.mocked(cacheLife).mockReset();
    vi.mocked(cacheTag).mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is read as a badge, by its exact name, under the package's tag, and kept for hours", async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(read('READ'));

    await expect(loadBadgePackage('React-Tools')).resolves.toMatchObject({ kind: 'package', name: 'React-Tools' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      expect.anything(),
      { registry: 'NPM', name: 'React-Tools', limit: 8 },
      { source: 'badge' },
    );
    expect(cacheTag).toHaveBeenCalledWith('package:npm/react-tools');
    expect(cacheLife).toHaveBeenCalledWith('hours');
  });

  it('is none for a name not read yet, kept for minutes so its first read shows soon', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(read('NOT_READ'));

    await expect(loadBadgePackage('react-tools')).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledWith('minutes');
  });

  it('throws for the images and is none for the page while package data cannot be read, kept for minutes', async () => {
    vi.mocked(graphqlDirect).mockRejectedValueOnce(unavailable());
    await expect(loadBadgePackage('react-tools')).rejects.toThrow();
    expect(cacheLife).toHaveBeenCalledWith('minutes');

    vi.mocked(graphqlDirect).mockRejectedValueOnce(unavailable());
    await expect(loadBadgePackageCard('react-tools')).resolves.toBeNull();
  });

  it('throws any other failure, and asks nothing while the site is built', async () => {
    vi.mocked(graphqlDirect).mockRejectedValueOnce(new Error('boom'));
    await expect(loadBadgePackageCard('react-tools')).rejects.toThrow('boom');

    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    await expect(loadBadgePackageCard('react-tools')).resolves.toBeNull();
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });
});
