import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EntityFacts } from './facts';
import { NOW, orgBig, repoBig, repoMid, repoUnranked, userMid } from './fixtures';
import { BADGE_CACHE_CONTROL, type BadgeLoaders, getBadgeResponse, parseBadgeFile, parseEntityRef } from './route';

const loaders = {
  user: vi.fn<BadgeLoaders['user']>(),
  org: vi.fn<BadgeLoaders['org']>(),
  repo: vi.fn<BadgeLoaders['repo']>(),
};

vi.mock('./load', () => ({ loadBadgeUser: loaders.user, loadBadgeOrg: loaders.org, loadBadgeRepo: loaders.repo }));

const { GET: userGet } = await import('@/app/badge/user/[login]/[file]/route');
const { GET: orgGet } = await import('@/app/badge/org/[login]/[file]/route');
const { GET: repoGet } = await import('@/app/badge/repo/[owner]/[name]/[file]/route');

const repoResponse = (owner: string, name: string, file: string, query = '') =>
  getBadgeResponse(parseEntityRef('repo', { owner, name }), file, new URLSearchParams(query), loaders, NOW);

const userResponse = (login: string, file: string, query = '') =>
  getBadgeResponse(parseEntityRef('user', { login }), file, new URLSearchParams(query), loaders, NOW);

const resolved = (entity: EntityFacts | null) => async () => entity;

describe('parseBadgeFile', () => {
  it('takes an id and svg or png', () => {
    expect(parseBadgeFile('rank.svg')).toEqual({ id: 'rank', format: 'svg' });
    expect(parseBadgeFile('rank-card.png')).toEqual({ id: 'rank-card', format: 'png' });
    expect(parseBadgeFile('rank.gif')).toBeNull();
    expect(parseBadgeFile('Rank.svg')).toBeNull();
    expect(parseBadgeFile('../rank.svg')).toBeNull();
  });
});

describe('getBadgeResponse', () => {
  beforeEach(() => {
    for (const loader of Object.values(loaders)) loader.mockReset();
  });

  it('draws an available shield as SVG, kept a day at the edge', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const response = await repoResponse('acme', 'fastqueue', 'rank.svg');
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800',
    );
    expect(body).toMatch(/^<svg width="[\d.]+" height="20"/);
    expect(loaders.repo).toHaveBeenCalledWith('acme', 'fastqueue');
  });

  it('draws the same image, with the same cache rule, whatever pending stamp or version the URL carries', async () => {
    loaders.repo.mockImplementation(resolved(repoUnranked));
    for (const [file, query] of [
      ['star-history.svg', ''],
      ['stars-card.svg', 'scheme=night'],
      ['rank.svg', 'extra=none&theme=dark'],
    ] as const) {
      const clean = await repoResponse('acme', 'fastqueue', file, query);
      const stamped = await repoResponse('acme', 'fastqueue', file, `${query}&pending=mh2k9x1c&v=1wub6og`);
      expect(stamped.status).toBe(clean.status);
      expect(stamped.headers.get('cache-control')).toBe(clean.headers.get('cache-control'));
      expect(await stamped.text()).toBe(await clean.text());
    }
  });

  it('draws a PNG at twice the size', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const response = await repoResponse('acme', 'fastqueue', 'rank-card.png');
    const png = new Uint8Array(await response.arrayBuffer());
    const view = new DataView(png.buffer);

    expect(response.headers.get('content-type')).toBe('image/png');
    expect([...png.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    expect({ width: view.getUint32(16), height: view.getUint32(20) }).toEqual({ width: 800, height: 240 });
  });

  it('answers a badge that never applied with "not yet", kept minutes at the edge', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const response = await repoResponse('acme', 'fastqueue', 'contributors.svg');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
  });

  it('keeps a volatile badge with nothing to show as a badge', async () => {
    loaders.repo.mockImplementation(resolved({ ...repoMid, gainedThisMonth: 0 }));
    const response = await repoResponse('acme', 'fastqueue', 'month.svg');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(BADGE_CACHE_CONTROL.badge);
  });

  it('draws star history as the old route does, and "preparing" without a history', async () => {
    loaders.repo.mockImplementation(resolved(repoBig));
    const chart = await repoResponse('nebula', 'ui', 'star-history.svg');
    expect(chart.headers.get('cache-control')).toBe(BADGE_CACHE_CONTROL.badge);
    expect(await chart.text()).toContain('fill-opacity="0.2"');

    loaders.repo.mockImplementation(resolved(repoUnranked));
    const preparing = await repoResponse('acme', 'fastqueue', 'star-history.svg');
    expect(preparing.status).toBe(200);
    // Kept minutes: the chart replaces it soon after a fetch.
    expect(preparing.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=300');
    expect(await preparing.text()).not.toContain('fill-opacity="0.2"');
  });

  it('answers 404 for an unknown entity, cached a day at the edge', async () => {
    loaders.repo.mockImplementation(resolved(null));
    const response = await repoResponse('acme', 'nothing', 'rank.svg');

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300, s-maxage=86400');
  });

  it.each([
    ['acme', 'fastqueue', 'nope.svg'],
    ['acme', 'fastqueue', 'rank.gif'],
    ['acme', 'fastqueue', 'profile-card.svg'],
    ['-acme', 'fastqueue', 'rank.svg'],
    ['acme', 'fast queue', 'rank.svg'],
  ])('answers 404 for %s/%s/%s without reading data', async (owner, name, file) => {
    const response = await repoResponse(owner, name, file);

    expect(response.status).toBe(404);
    expect(loaders.repo).not.toHaveBeenCalled();
  });

  it('redirects another spelling to the stored one, keeping the file and the query', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const response = await repoResponse('ACME', 'FastQueue', 'rank.svg', 'scheme=violet&v=2');

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/badge/repo/acme/fastqueue/rank.svg?scheme=violet&v=2');
    expect(response.headers.get('cache-control')).toBe(BADGE_CACHE_CONTROL.badge);
  });

  it("redirects a developer's login to its stored case", async () => {
    loaders.user.mockImplementation(resolved(userMid));
    const response = await userResponse('Octo-Dev', 'rank.png');

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/badge/user/octo-dev/rank.png');
  });

  it('answers a short-cached 503 when the data cannot be read', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    loaders.repo.mockRejectedValue(new Error('x'));
    const response = await repoResponse('acme', 'fastqueue', 'rank.svg');

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it.each(['extra=bogus', 'extra=of', 'left=%23000', 'right=%23000', 'scheme=tint', 'scheme=tier', 'label=x&logo=2'])(
    'answers 400 for %s without reading data',
    async (query) => {
      const response = await repoResponse('acme', 'fastqueue', 'rank.svg', query);

      expect(response.status).toBe(400);
      expect(loaders.repo).not.toHaveBeenCalled();
    },
  );

  it('ignores unknown keys', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const plain = await (await repoResponse('acme', 'fastqueue', 'rank.svg')).text();
    const busted = await (await repoResponse('acme', 'fastqueue', 'rank.svg', 'v=2&cache=bust')).text();

    expect(busted).toBe(plain);
  });

  it('joins both Auto drawings in one SVG, or pins one with theme', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const both = await (await repoResponse('acme', 'fastqueue', 'rank-card.svg')).text();
    const dark = await (await repoResponse('acme', 'fastqueue', 'rank-card.svg', 'theme=dark')).text();

    expect(both).toContain('@media (prefers-color-scheme: dark)');
    expect(both).toContain('<g class="l">');
    expect(both).toContain('<g class="d">');
    expect(dark).not.toContain('prefers-color-scheme');
  });
});

describe('the route handlers', () => {
  beforeEach(() => {
    for (const loader of Object.values(loaders)) loader.mockReset();
  });

  const request = (path: string) => new NextRequest(`http://localhost${path}`);

  it('serves /badge/user/{login}/{badge}', async () => {
    loaders.user.mockImplementation(resolved(userMid));
    const response = await userGet(request('/badge/user/octo-dev/rank.svg?scheme=auto'), {
      params: Promise.resolve({ login: 'octo-dev', file: 'rank.svg' }),
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('prefers-color-scheme');
  });

  it('serves /badge/org/{login}/{badge}', async () => {
    loaders.org.mockImplementation(resolved(orgBig));
    const response = await orgGet(request('/badge/org/nebula/stars.svg'), {
      params: Promise.resolve({ login: 'nebula', file: 'stars.svg' }),
    });

    expect(response.status).toBe(200);
    expect(loaders.org).toHaveBeenCalledWith('nebula');
  });

  it('serves /badge/repo/{owner}/{name}/{badge}', async () => {
    loaders.repo.mockImplementation(resolved(repoMid));
    const response = await repoGet(request('/badge/repo/acme/fastqueue/rank.svg?extra=none'), {
      params: Promise.resolve({ owner: 'acme', name: 'fastqueue', file: 'rank.svg' }),
    });

    expect(response.status).toBe(200);
    expect(loaders.repo).toHaveBeenCalledWith('acme', 'fastqueue');
  });

  it('decodes an encoded repository name', async () => {
    loaders.repo.mockImplementation(resolved({ ...repoMid, nameWithOwner: 'acme/fast.queue' }));
    const response = await repoGet(request('/badge/repo/acme/fast%2Equeue/rank.svg'), {
      params: Promise.resolve({ owner: 'acme', name: 'fast%2Equeue', file: 'rank.svg' }),
    });

    expect(response.status).toBe(200);
    expect(loaders.repo).toHaveBeenCalledWith('acme', 'fast.queue');
  });
});
