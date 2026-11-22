import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { parseUsedByQuery } from './used-by-query';
import { firstPage, threePackages } from '@/components/dependents/dependents.fixtures';

const { fetchRepoPackages, fetchRepoUsedBy } = vi.hoisted(() => ({
  fetchRepoPackages: vi.fn(),
  fetchRepoUsedBy: vi.fn(),
}));
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
    fetchRepoPackages.mockReset().mockResolvedValue(threePackages);
    fetchRepoUsedBy.mockReset().mockResolvedValue(firstPage);
  });

  it('answers a page, cacheable by shared caches', async () => {
    const response = await call('?offset=25&package=%40nebula%2Fui&archived=0');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PUBLIC);
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBeNull();
    expect(await response.json()).toEqual({ page: firstPage });
    expect(fetchRepoUsedBy).toHaveBeenCalledExactlyOnceWith('nebula', 'ui', {
      offset: 25,
      limit: 25,
      package: { registry: 'npm', name: '@nebula/ui' },
      hideArchived: true,
    });
  });

  it('reads a package on another registry by its registry and name, the one the repository lists', async () => {
    fetchRepoPackages.mockResolvedValue({
      ...threePackages,
      items: [...threePackages.items, { registry: 'PYPI', name: 'nebula-ui', dependents: 2, downloadsLastWeek: null }],
    });

    expect((await call('?package=nebula-ui&registry=pypi')).status).toBe(200);
    expect(fetchRepoUsedBy).toHaveBeenCalledExactlyOnceWith('nebula', 'ui', {
      offset: 0,
      limit: 25,
      package: { registry: 'pypi', name: 'nebula-ui' },
      hideArchived: false,
    });
  });

  it('reads a PyPI name in any spelling PyPI takes as the same, by the spelling the repository lists it in', async () => {
    fetchRepoPackages.mockResolvedValue({
      ...threePackages,
      items: [...threePackages.items, { registry: 'PYPI', name: 'django', dependents: 2, downloadsLastWeek: null }],
    });

    for (const spelled of ['Django', 'DJANGO', 'django']) {
      expect((await call(`?package=${spelled}&registry=pypi`)).status).toBe(200);
    }
    expect(fetchRepoUsedBy).toHaveBeenCalledTimes(3);
    for (const [, , query] of fetchRepoUsedBy.mock.calls) {
      expect(query.package).toEqual({ registry: 'pypi', name: 'django' });
    }
  });

  it('answers an empty page for a package the repository does not list, without reading it', async () => {
    const response = await call('?package=react');

    expect(await response.json()).toEqual({ page: { total: 0, archived: 0, items: [] } });
    // Its name on another registry is another package.
    expect((await call('?package=%40nebula%2Fui&registry=pypi')).status).toBe(400);
    expect(await (await call('?package=nebula-ui&registry=pypi')).json()).toEqual({
      page: { total: 0, archived: 0, items: [] },
    });
    expect(fetchRepoUsedBy).not.toHaveBeenCalled();
  });

  it('is not found for a repository that publishes nothing', async () => {
    fetchRepoPackages.mockResolvedValue(null);

    expect((await call()).status).toBe(404);
  });

  it('says when package data cannot be read just now, kept by no cache', async () => {
    fetchRepoUsedBy.mockResolvedValue('unavailable');

    const response = await call();
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe(PRIVATE);

    fetchRepoPackages.mockResolvedValue('unavailable');
    expect((await call()).status).toBe(503);
  });

  it('answers a failed read with a 502', async () => {
    fetchRepoUsedBy.mockRejectedValue(new Error('boom'));

    expect((await call()).status).toBe(502);
  });

  it.each([
    '?offset=3',
    '?offset=-25',
    '?offset=5025',
    '?offset=1e2',
    '?package=.env',
    '?archived=1',
    '?package=',
    '?package=react&registry=NPM',
    '?package=react&registry=maven',
    '?registry=pypi',
    '?package=-numpy&registry=pypi',
  ])('refuses %s', async (search) => {
    const response = await call(search);
    expect(response.status).toBe(400);
    expect(fetchRepoUsedBy).not.toHaveBeenCalled();
  });

  it('refuses an impossible repository', async () => {
    expect((await call('', '-x', 'y')).status).toBe(400);
  });
});

describe('parseUsedByQuery', () => {
  it('reads the offset, the package and archived=0', () => {
    expect(parseUsedByQuery(new URLSearchParams(''))).toEqual({ offset: 0, package: null, hideArchived: false });
    expect(parseUsedByQuery(new URLSearchParams('offset=50&package=react&archived=0'))).toEqual({
      offset: 50,
      package: { registry: 'npm', name: 'react' },
      hideArchived: true,
    });
    expect(parseUsedByQuery(new URLSearchParams('package=Zope.Interface&registry=pypi'))).toEqual({
      offset: 0,
      package: { registry: 'pypi', name: 'zope-interface' },
      hideArchived: false,
    });
  });

  it('reads as far as offset 5000, the furthest page the API serves', () => {
    expect(parseUsedByQuery(new URLSearchParams('offset=5000'))).toMatchObject({ offset: 5000 });
    expect(parseUsedByQuery(new URLSearchParams('offset=5025'))).toBeNull();
  });
});
