import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { packageBig, packageNew } from '@/badge/v3/fixtures';
import { BADGE_CACHE_HEADERS } from '@/badge/v3/route';

const { loadBadgePackage, packagesPublic, requestMaySeePackages, after } = vi.hoisted(() => ({
  loadBadgePackage: vi.fn(),
  packagesPublic: vi.fn<() => Promise<boolean>>(),
  requestMaySeePackages: vi.fn<(req: { headers: Headers }) => Promise<boolean>>(),
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
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic, requestMaySeePackages }));
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

const PRIVATE = { 'Cache-Control': 'private, no-store', 'Cloudflare-CDN-Cache-Control': null };

describe('/badge/package/npm/<name>/<badge>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    packagesPublic.mockResolvedValue(false);
    requestMaySeePackages.mockResolvedValue(false);
    loadBadgePackage.mockImplementation(async (_registry: string, name: string) =>
      name === packageBig.name ? packageBig : name === packageNew.name ? packageNew : null,
    );
  });

  it('is not found, private, for anyone packages are hidden from, without reading anything', async () => {
    const response = await get('/badge/package/npm/react-resize-detector/used-by.svg', {
      'user-agent': 'github-camo (abc)',
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Badge not found');
    expect(cacheHeaders(response)).toEqual(PRIVATE);
    expect(loadBadgePackage).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it('draws the image for a preview viewer, kept by nobody', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    const response = await get('/badge/package/npm/react-resize-detector/used-by.svg?theme=dark');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toMatch(/^image\/svg\+xml/);
    expect(cacheHeaders(response)).toEqual(PRIVATE);
    expect(loadBadgePackage).toHaveBeenCalledWith('npm', 'react-resize-detector');
  });

  it('keeps every answer private while packages are not open to everyone: a redirect, a miss, a bad query', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    const redirect = await get('/badge/package/npm/%40nebula/ui/downloads.svg');
    expect(redirect.status).toBe(308);
    expect(redirect.headers.get('Location')).toBe('/badge/package/npm/@nebula/ui/downloads.svg');
    expect(cacheHeaders(redirect)).toEqual(PRIVATE);

    const missing = await get('/badge/package/npm/left-pad/used-by.svg');
    expect(missing.status).toBe(404);
    expect(cacheHeaders(missing)).toEqual(PRIVATE);

    const invalid = await get('/badge/package/npm/react-resize-detector/used-by.svg?scheme=nope');
    expect(invalid.status).toBe(400);
    expect(cacheHeaders(invalid)).toEqual(PRIVATE);
  });

  it('answers as every badge once packages are open to everyone, and reports a README hit', async () => {
    packagesPublic.mockResolvedValue(true);
    const response = await get('/badge/package/npm/react-resize-detector/used-by.svg', {
      'user-agent': 'github-camo (abc)',
    });

    expect(response.status).toBe(200);
    expect(cacheHeaders(response)).toEqual(BADGE_CACHE_HEADERS.badge);
    expect(requestMaySeePackages).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledOnce();

    const scoped = await get('/badge/package/npm/@nebula/ui/downloads.png');
    expect(scoped.status).toBe(200);
    expect(scoped.headers.get('Content-Type')).toBe('image/png');
    expect(loadBadgePackage).toHaveBeenLastCalledWith('npm', '@nebula/ui');
  });

  it('is not found for a path that names no package, as every badge', async () => {
    packagesPublic.mockResolvedValue(true);
    for (const path of [
      '/badge/package/npm/used-by.svg',
      '/badge/package/pypi/react/used-by.svg',
      '/badge/package/npm/a/b/c/used-by.svg',
      '/badge/package/npm/types/node/used-by.svg',
      '/badge/package/npm/react-resize-detector/rank.svg',
    ]) {
      const response = await get(path);
      expect(response.status, path).toBe(404);
      expect(cacheHeaders(response), path).toEqual(BADGE_CACHE_HEADERS.notFound);
    }
  });
});
