import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { packageBig, packageNew, packagePypi } from '@/badge/v3/fixtures';
import { BADGE_CACHE_HEADERS } from '@/badge/v3/route';

const { loadBadgePackage, after } = vi.hoisted(() => ({
  loadBadgePackage: vi.fn(),
  after: vi.fn(),
}));

vi.mock('@/badge/v3/load', () => ({
  loadBadgeUser: vi.fn(),
  loadBadgeOrg: vi.fn(),
  loadBadgeRepo: vi.fn(),
  loadBadgePackage,
}));
vi.mock('@/badge/v3/avatars', () => ({
  fetchAvatar: async () => null,
  fetchAvatars: async (urls: unknown[]) => urls.map(() => null),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));

const { GET } = await import('./route');

/** The route as Next calls it: the params decoded, the path as it was asked. */
const get = (path: string, headers: Record<string, string> = {}) => {
  const url = new URL(path, 'https://gitranks.com');
  const [, , , registry, ...rest] = url.pathname.split('/');
  return GET(new NextRequest(url, { headers }), {
    params: Promise.resolve({ registry, rest: rest.map(decodeURIComponent) }),
  });
};

const cacheHeaders = (response: Response) => ({
  'Cache-Control': response.headers.get('Cache-Control'),
  'Cloudflare-CDN-Cache-Control': response.headers.get('Cloudflare-CDN-Cache-Control'),
});

describe('/badge/package/npm/<name>/<badge>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadBadgePackage.mockImplementation(async (registry: string, name: string) =>
      registry === 'pypi'
        ? name === packagePypi.name
          ? packagePypi
          : null
        : name === packageBig.name
          ? packageBig
          : name === packageNew.name
            ? packageNew
            : null,
    );
  });

  it('answers as every badge, and reports a README hit', async () => {
    const response = await get('/badge/package/npm/react-resize-detector/used-by.svg', {
      'user-agent': 'github-camo (abc)',
    });

    expect(response.status).toBe(200);
    expect(cacheHeaders(response)).toEqual(BADGE_CACHE_HEADERS.badge);
    expect(after).toHaveBeenCalledOnce();

    const scoped = await get('/badge/package/npm/@nebula/ui/downloads.png');
    expect(scoped.status).toBe(200);
    expect(scoped.headers.get('Content-Type')).toBe('image/png');
    expect(loadBadgePackage).toHaveBeenLastCalledWith('npm', '@nebula/ui');
  });

  it('redirects another spelling to the badge address, and answers a bad query 400', async () => {
    const redirect = await get('/badge/package/npm/%40nebula/ui/downloads.svg');
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get('Location')).toBe('/badge/package/npm/@nebula/ui/downloads.svg');

    expect((await get('/badge/package/npm/left-pad/used-by.svg')).status).toBe(404);
    expect((await get('/badge/package/npm/react-resize-detector/used-by.svg?scheme=nope')).status).toBe(400);
  });

  it("sends another spelling of a PyPI name to its folded name's badge, for good, before anything is read", async () => {
    for (const [path, location] of [
      ['/badge/package/pypi/Django/downloads.svg', '/badge/package/pypi/django/downloads.svg'],
      ['/badge/package/pypi/zope.interface/used-by.svg', '/badge/package/pypi/zope-interface/used-by.svg'],
      [
        '/badge/package/pypi/Zope__Interface/used-by.png?scheme=dark',
        '/badge/package/pypi/zope-interface/used-by.png?scheme=dark',
      ],
    ]) {
      const response = await get(path);
      expect(response.status, path).toBe(308);
      expect(response.headers.get('Location'), path).toBe(location);
      expect(cacheHeaders(response), path).toEqual(BADGE_CACHE_HEADERS.badge);
    }
    expect(loadBadgePackage).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it('draws the folded name of a PyPI project as any badge', async () => {
    const response = await get('/badge/package/pypi/zope-interface/downloads.svg');
    expect(response.status).toBe(200);
    expect(loadBadgePackage).toHaveBeenCalledWith('pypi', 'zope-interface');
    expect(response.headers.get('Content-Type')).toContain('image/svg+xml');
    expect((await get('/badge/package/pypi/zope-interface/rank.svg')).status).toBe(404);
  });

  it('is not found for a path that names no package, as every badge', async () => {
    for (const path of [
      '/badge/package/npm/used-by.svg',
      '/badge/package/cargo/react/used-by.svg',
      '/badge/package/npm/a/b/c/used-by.svg',
      '/badge/package/npm/types/node/used-by.svg',
      '/badge/package/pypi/zope/interface/used-by.svg',
      '/badge/package/pypi/-x/used-by.svg',
      '/badge/package/npm/react-resize-detector/rank.svg',
    ]) {
      const response = await get(path);
      expect(response.status, path).toBe(404);
      expect(cacheHeaders(response), path).toEqual(BADGE_CACHE_HEADERS.notFound);
    }
  });
});
