import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseUsedByQuery } from './used-by-query';
import { firstPage, threePackages } from '@/components/dependents/dependents.fixtures';

const { packagesPublic, requestMaySeePackages, fetchRepoPackages, fetchRepoUsedBy } = vi.hoisted(() => ({
  packagesPublic: vi.fn(async () => false),
  requestMaySeePackages: vi.fn(async (_req: unknown) => false),
  fetchRepoPackages: vi.fn(),
  fetchRepoUsedBy: vi.fn(),
}));
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic, requestMaySeePackages }));
vi.mock('@/graphql/helpers/fetch-repo-packages', () => ({
  UNAVAILABLE: 'unavailable',
  fetchRepoPackages,
  fetchRepoUsedBy,
}));

const { GET } = await import('./route');

const call = (search = '', owner = 'nebula', name = 'ui') =>
  GET(new NextRequest(`https://gitranks.com/api/repo/${owner}/${name}/used-by${search}`), {
    params: Promise.resolve({ owner, name }),
  });

const PRIVATE = 'private, no-store';
const PUBLIC = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

describe('repo used-by route', () => {
  beforeEach(() => {
    packagesPublic.mockReset().mockResolvedValue(false);
    requestMaySeePackages.mockReset().mockResolvedValue(false);
    fetchRepoPackages.mockReset().mockResolvedValue(threePackages);
    fetchRepoUsedBy.mockReset().mockResolvedValue(firstPage);
  });

  it('answers the not-found answer, kept by no cache, to a visitor who may not see package pages, reading nothing', async () => {
    const response = await call('?offset=25');

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe(PRIVATE);
    expect(fetchRepoPackages).not.toHaveBeenCalled();
    expect(fetchRepoUsedBy).not.toHaveBeenCalled();
  });

  it('answers a page to a visitor who may see them, kept by no shared cache while they are not public', async () => {
    requestMaySeePackages.mockResolvedValue(true);

    const response = await call('?offset=25&package=%40nebula%2Fui&archived=0');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PRIVATE);
    expect(await response.json()).toEqual({ page: firstPage });
    expect(fetchRepoUsedBy).toHaveBeenCalledExactlyOnceWith('nebula', 'ui', {
      offset: 25,
      limit: 25,
      package: '@nebula/ui',
      hideArchived: true,
    });
  });

  it('is cacheable by shared caches once package pages are public', async () => {
    packagesPublic.mockResolvedValue(true);

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PUBLIC);
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    expect(requestMaySeePackages).not.toHaveBeenCalled();
  });

  it('answers an empty page for a package the repository does not list, without reading it', async () => {
    requestMaySeePackages.mockResolvedValue(true);

    const response = await call('?package=react');

    expect(await response.json()).toEqual({ page: { total: 0, archived: 0, items: [] } });
    expect(fetchRepoUsedBy).not.toHaveBeenCalled();
  });

  it('is not found for a repository that publishes nothing', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    fetchRepoPackages.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
  });

  it('says when package data cannot be read just now, kept by no cache', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    fetchRepoUsedBy.mockResolvedValue('unavailable');

    const response = await call();
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe(PRIVATE);

    fetchRepoPackages.mockResolvedValue('unavailable');
    expect((await call()).status).toBe(503);
  });

  it('answers a failed read with a 502', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    fetchRepoUsedBy.mockRejectedValue(new Error('boom'));

    expect((await call()).status).toBe(502);
  });

  it.each(['?offset=3', '?offset=-25', '?offset=5025', '?offset=1e2', '?package=.env', '?archived=1', '?package='])(
    'refuses %s',
    async (search) => {
      requestMaySeePackages.mockResolvedValue(true);

      const response = await call(search);
      expect(response.status).toBe(400);
      expect(fetchRepoUsedBy).not.toHaveBeenCalled();
    },
  );

  it('refuses an impossible repository', async () => {
    requestMaySeePackages.mockResolvedValue(true);

    expect((await call('', '-x', 'y')).status).toBe(400);
  });
});

describe('parseUsedByQuery', () => {
  it('reads the offset, the package and archived=0', () => {
    expect(parseUsedByQuery(new URLSearchParams(''))).toEqual({ offset: 0, package: null, hideArchived: false });
    expect(parseUsedByQuery(new URLSearchParams('offset=50&package=react&archived=0'))).toEqual({
      offset: 50,
      package: 'react',
      hideArchived: true,
    });
  });

  it('reads as far as offset 5000, the furthest page the API serves', () => {
    expect(parseUsedByQuery(new URLSearchParams('offset=5000'))).toMatchObject({ offset: 5000 });
    expect(parseUsedByQuery(new URLSearchParams('offset=5025'))).toBeNull();
  });
});
