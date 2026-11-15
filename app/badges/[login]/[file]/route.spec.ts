import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { renderCanonicalBadge as RenderCanonicalBadge } from '@/badge/render-canonical-badge';

const renderCanonicalBadge = vi.fn<typeof RenderCanonicalBadge>();
vi.mock('@/badge/render-canonical-badge', () => ({ renderCanonicalBadge }));

const { after, reportBadgeSeen } = vi.hoisted(() => ({
  after: vi.fn<(task: () => Promise<void>) => void>(),
  reportBadgeSeen: vi.fn<(kind: 'user' | 'repo', name: string) => Promise<void>>(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));
vi.mock('@/badge/badge-seen', () => ({ reportBadgeSeen }));

const { GET } = await import('./route');

const get = (login: string, file: string, query = '') =>
  GET(new NextRequest(`https://gitranks.com/badges/${login}/${file}${query}`), {
    params: Promise.resolve({ login, file }),
  });

const cacheHeadersOf = (response: Response) => ({
  cacheControl: response.headers.get('cache-control'),
  edge: response.headers.get('cloudflare-cdn-cache-control'),
});

const IMAGE = 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';
const MISS = 'public, max-age=300, s-maxage=86400';

describe('GET /badges/[login]/[file]', () => {
  beforeEach(() => {
    renderCanonicalBadge.mockReset();
    renderCanonicalBadge.mockResolvedValue({ body: '<svg/>', contentType: 'image/svg+xml' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('draws the badge of the login and the file', async () => {
    const response = await get('OctoCat', 'stars-rank.svg');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    expect(await response.text()).toBe('<svg/>');
    expect(renderCanonicalBadge).toHaveBeenCalledWith('OctoCat', 'stars-rank', 'svg');
  });

  it('answers 404 for a file that is no badge, without drawing, and for an unknown profile', async () => {
    const noBadge = await get('octocat', 'nope.gif');
    expect(noBadge.status).toBe(404);
    expect(renderCanonicalBadge).not.toHaveBeenCalled();

    renderCanonicalBadge.mockResolvedValue(null);
    expect((await get('nobody', 'stars-rank.svg')).status).toBe(404);
  });

  it.each([
    [undefined, ''],
    ['off', '?probe=1'],
    ['probe', ''],
    ['probe', '?probe=0'],
    ['anything-else', '?probe=1'],
  ])("sends today's one header when the switch is %s and the query is '%s'", async (mode, query) => {
    vi.stubEnv('BADGE_CACHE_SPLIT', mode);

    expect(cacheHeadersOf(await get('octocat', 'stars-rank.svg', query))).toEqual({ cacheControl: IMAGE, edge: null });
    expect(cacheHeadersOf(await get('octocat', 'nope.gif', query))).toEqual({ cacheControl: MISS, edge: null });
    renderCanonicalBadge.mockResolvedValue(null);
    expect(cacheHeadersOf(await get('nobody', 'stars-rank.svg', query))).toEqual({ cacheControl: MISS, edge: null });
  });

  it.each([
    ['on', ''],
    ['probe', '?probe=1'],
  ])("splits the lifetimes when the switch is %s and the query is '%s'", async (mode, query) => {
    vi.stubEnv('BADGE_CACHE_SPLIT', mode);

    expect(cacheHeadersOf(await get('octocat', 'stars-rank.svg', query))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: 'max-age=86400, stale-while-revalidate=604800',
    });
    expect(cacheHeadersOf(await get('octocat', 'nope.gif', query))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: 'max-age=86400',
    });
    renderCanonicalBadge.mockResolvedValue(null);
    expect(cacheHeadersOf(await get('nobody', 'stars-rank.svg', query))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: 'max-age=86400',
    });
  });

  it('on-no-swr leaves stale-while-revalidate out of the edge header', async () => {
    vi.stubEnv('BADGE_CACHE_SPLIT', 'on-no-swr');

    expect(cacheHeadersOf(await get('octocat', 'stars-rank.svg'))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: 'max-age=86400',
    });
  });

  it('short sends the browser lifetime alone', async () => {
    vi.stubEnv('BADGE_CACHE_SPLIT', 'short');

    expect(cacheHeadersOf(await get('octocat', 'stars-rank.svg'))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: null,
    });
    expect(cacheHeadersOf(await get('octocat', 'nope.gif'))).toEqual({
      cacheControl: 'public, max-age=300',
      edge: null,
    });
  });
});

describe("GET /badges/[login]/[file]: the report of GitHub's image proxy", () => {
  const getAs = (userAgent: string, login = 'OctoCat', file = 'stars-rank.svg') =>
    GET(new NextRequest(`https://gitranks.com/badges/${login}/${file}`, { headers: { 'User-Agent': userAgent } }), {
      params: Promise.resolve({ login, file }),
    });

  beforeEach(() => {
    renderCanonicalBadge.mockReset();
    renderCanonicalBadge.mockResolvedValue({ body: '<svg/>', contentType: 'image/svg+xml' });
    after.mockReset();
    reportBadgeSeen.mockReset();
    reportBadgeSeen.mockResolvedValue();
  });

  it('reports a drawn badge after the response, with the login as requested', async () => {
    expect((await getAs('github-camo (876de43e)')).status).toBe(200);

    expect(reportBadgeSeen).not.toHaveBeenCalled();
    for (const [task] of after.mock.calls) await task();
    expect(reportBadgeSeen).toHaveBeenCalledExactlyOnceWith('user', 'OctoCat');
  });

  it('schedules nothing for a browser, or for a 404', async () => {
    await getAs('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)');
    await getAs('github-camo (876de43e)', 'octocat', 'nope.gif');
    renderCanonicalBadge.mockResolvedValue(null);
    await getAs('github-camo (876de43e)', 'nobody');

    expect(after).not.toHaveBeenCalled();
  });
});
