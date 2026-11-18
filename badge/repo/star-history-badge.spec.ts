import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StarHistoryRepoQuery } from '@/types/generated/graphql';

const fetchBadgeRepo = vi.fn<(owner: string, name: string) => Promise<StarHistoryRepoQuery['repo']>>();
vi.mock('./star-history-badge.loader', () => ({ fetchBadgeRepo }));

const { after, reportBadgeSeen } = vi.hoisted(() => ({
  after: vi.fn<(task: () => Promise<void>) => void>(),
  reportBadgeSeen: vi.fn<(kind: 'user' | 'repo', name: string) => Promise<void>>(),
}));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));
vi.mock('../badge-seen', () => ({ reportBadgeSeen }));

const { getStarHistoryBadgeResponse, parseStarHistoryFile, STAR_HISTORY_CACHE_HEADERS } = await import(
  './star-history-badge'
);
const { GET } = await import('@/app/repo-badges/[owner]/[name]/[file]/route');

const history = {
  points: [
    { date: '2024-02-10T00:00:00Z', stars: 0 },
    { date: '2024-03-01T00:00:00Z', stars: 25 },
  ],
  current: { date: '2024-03-04T00:00:00Z', stars: 31 },
};

const repo = (overrides: Partial<NonNullable<StarHistoryRepoQuery['repo']>> = {}) => ({
  nameWithOwner: 'octo/widgets',
  stars: 31,
  gainedThisMonth: 6,
  history: null,
  ...overrides,
});

describe('parseStarHistoryFile', () => {
  it('knows the SVG and the PNG and nothing else', () => {
    expect(parseStarHistoryFile('star-history.svg')).toBe('svg');
    expect(parseStarHistoryFile('star-history.png')).toBe('png');
    expect(parseStarHistoryFile('star-history.jpg')).toBeNull();
    expect(parseStarHistoryFile('stars-rank.svg')).toBeNull();
    expect(parseStarHistoryFile('toString')).toBeNull();
  });
});

describe('getStarHistoryBadgeResponse', () => {
  beforeEach(() => {
    fetchBadgeRepo.mockReset();
  });

  it.each([
    ['-octo', 'widgets', 'star-history.svg'],
    ['a'.repeat(40), 'widgets', 'star-history.svg'],
    ['octo_cat', 'widgets', 'star-history.svg'],
    ['octo', 'wid gets', 'star-history.svg'],
    ['octo', 'b'.repeat(101), 'star-history.svg'],
    ['octo', '%E0%A4%A', 'star-history.svg'],
    ['octo', 'widgets', 'star-history.gif'],
    ['octo', 'widgets', 'history.svg'],
  ])('answers 404 for %s/%s/%s without asking for data', async (owner, name, file) => {
    const response = await getStarHistoryBadgeResponse(owner, name, file);

    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe(STAR_HISTORY_CACHE_HEADERS.notFound['Cache-Control']);
    expect(fetchBadgeRepo).not.toHaveBeenCalled();
  });

  it('accepts the longest owner and name, decoded', async () => {
    fetchBadgeRepo.mockResolvedValue(null);
    const owner = `a${'-'.repeat(38)}`;
    const response = await getStarHistoryBadgeResponse(owner, `${'b'.repeat(98)}.%5F`, 'star-history.svg');

    expect(response.status).toBe(200);
    expect(fetchBadgeRepo).toHaveBeenCalledWith(owner, `${'b'.repeat(98)}._`);
  });

  it('draws the chart with a history and lets the edge keep it for a day', async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    const response = await getStarHistoryBadgeResponse('octo', 'widgets', 'star-history.svg');
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe(
      'max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
    );
    expect(svg).toContain('fill-opacity="0.2"');
    expect(fetchBadgeRepo).toHaveBeenCalledWith('octo', 'widgets');
  });

  it('draws the placeholder without a history and keeps it at the edge for an hour', async () => {
    fetchBadgeRepo.mockResolvedValue(repo());
    const response = await getStarHistoryBadgeResponse('octo', 'widgets', 'star-history.svg');
    const svg = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300, s-maxage=3600');
    expect(svg).toMatch(/^<svg width="1000" height="400"/);
    expect(svg).not.toContain('fill-opacity="0.2"');
  });

  it.each([
    ['svg', 'image/svg+xml; charset=utf-8'],
    ['png', 'image/png'],
  ])('serves the static not-tracked %s for a repository without data', async (format, contentType) => {
    fetchBadgeRepo.mockResolvedValue(null);
    const response = await getStarHistoryBadgeResponse('octo', 'unknown', `star-history.${format}`);
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(contentType);
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600, s-maxage=3600');
    expect(body.length).toBeGreaterThan(1000);
  });

  it('redirects another spelling to the stored one, keeping the file', async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ nameWithOwner: 'Octo/Widgets.js', history }));
    const response = await getStarHistoryBadgeResponse('octo', 'widgets.JS', 'star-history.png');

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/repo-badges/Octo/Widgets.js/star-history.png');
    expect(response.headers.get('cache-control')).toBe(STAR_HISTORY_CACHE_HEADERS.chart['Cache-Control']);
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe(
      STAR_HISTORY_CACHE_HEADERS.chart['Cloudflare-CDN-Cache-Control'],
    );
  });

  it('answers a short-cached 503 when the data cannot be read', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchBadgeRepo.mockRejectedValue(new Error('x'));
    const response = await getStarHistoryBadgeResponse('octo', 'widgets', 'star-history.svg');

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(response.headers.get('retry-after')).toBe('60');
    expect(await response.text()).toBe('');
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('serves a PNG of the chart', async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    const response = await getStarHistoryBadgeResponse('octo', 'widgets', 'star-history.png');
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.headers.get('content-type')).toBe('image/png');
    expect([...body.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  });
});

describe('the cache headers of each answer', () => {
  const get = (owner: string, name: string, file: string) =>
    GET(new NextRequest(`https://gitranks.com/repo-badges/${owner}/${name}/${file}`), {
      params: Promise.resolve({ owner, name, file }),
    });

  const headersOf = (response: Response) => ({
    cacheControl: response.headers.get('cache-control'),
    edge: response.headers.get('cloudflare-cdn-cache-control'),
  });

  /** One answer of each kind: the chart and its redirect, kept long, then the ones kept shorter. */
  const answers = async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    const chart = await get('octo', 'widgets', 'star-history.svg');
    const redirect = await get('OCTO', 'Widgets', 'star-history.svg');
    const notFound = await get('octo', 'widgets', 'history.svg');
    fetchBadgeRepo.mockResolvedValue(repo());
    const preparing = await get('octo', 'widgets', 'star-history.svg');
    fetchBadgeRepo.mockResolvedValue(null);
    const notTracked = await get('octo', 'unknown', 'star-history.svg');
    fetchBadgeRepo.mockRejectedValue(new Error('x'));
    const unavailable = await get('octo', 'widgets', 'star-history.svg');

    expect([chart, redirect, notFound, preparing, notTracked, unavailable].map(({ status }) => status)).toEqual([
      200, 308, 404, 200, 200, 503,
    ]);
    return {
      long: { chart: headersOf(chart), redirect: headersOf(redirect) },
      short: {
        notFound: headersOf(notFound),
        preparing: headersOf(preparing),
        notTracked: headersOf(notTracked),
        unavailable: headersOf(unavailable),
      },
    };
  };

  beforeEach(() => {
    fetchBadgeRepo.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the chart and its redirect minutes in the browser and a day at the edge, the rest as they were', async () => {
    const chart = {
      cacheControl: 'public, max-age=300',
      edge: 'max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
    };

    expect(await answers()).toEqual({
      long: { chart, redirect: chart },
      short: {
        notFound: { cacheControl: 'public, max-age=300, s-maxage=300', edge: null },
        preparing: { cacheControl: 'public, max-age=300, s-maxage=3600', edge: null },
        notTracked: { cacheControl: 'public, max-age=3600, s-maxage=3600', edge: null },
        unavailable: { cacheControl: 'public, max-age=60, s-maxage=60', edge: null },
      },
    });
  });
});

describe("the report of GitHub's image proxy", () => {
  const onImageServed = vi.fn<(kind: 'user' | 'repo' | 'package', name: string) => void>();
  const respond = (owner: string, name: string, file = 'star-history.svg') =>
    getStarHistoryBadgeResponse(owner, name, file, onImageServed);

  beforeEach(() => {
    fetchBadgeRepo.mockReset();
    onImageServed.mockReset();
    after.mockReset();
    reportBadgeSeen.mockReset();
    reportBadgeSeen.mockResolvedValue();
  });

  it('tells the hook the stored name once the chart or its placeholder is drawn', async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    expect((await respond('octo', 'widgets')).status).toBe(200);
    fetchBadgeRepo.mockResolvedValue(repo());
    expect((await respond('octo', 'widgets', 'star-history.png')).status).toBe(200);

    expect(onImageServed.mock.calls).toEqual([
      ['repo', 'octo/widgets'],
      ['repo', 'octo/widgets'],
    ]);
  });

  it('tells it nothing for an unknown repository, a redirect or an error answer', async () => {
    fetchBadgeRepo.mockResolvedValue(null);
    expect((await respond('octo', 'unknown')).status).toBe(200);
    fetchBadgeRepo.mockResolvedValue(repo({ nameWithOwner: 'Octo/Widgets', history }));
    expect((await respond('octo', 'widgets')).status).toBe(308);
    expect((await respond('octo', 'widgets', 'history.svg')).status).toBe(404);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchBadgeRepo.mockRejectedValue(new Error('x'));
    expect((await respond('octo', 'widgets')).status).toBe(503);

    expect(onImageServed).not.toHaveBeenCalled();
  });

  it('keeps the image when the hook throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    onImageServed.mockImplementation(() => {
      throw new Error('outside a request');
    });

    expect((await respond('octo', 'widgets')).status).toBe(200);
  });

  it('the route reports after the response for the proxy only', async () => {
    fetchBadgeRepo.mockResolvedValue(repo({ history }));
    const get = (userAgent: string) =>
      GET(
        new NextRequest('https://gitranks.com/repo-badges/octo/widgets/star-history.svg', {
          headers: { 'User-Agent': userAgent },
        }),
        { params: Promise.resolve({ owner: 'octo', name: 'widgets', file: 'star-history.svg' }) },
      );

    expect((await get('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).status).toBe(200);
    expect(after).not.toHaveBeenCalled();

    expect((await get('github-camo (876de43e)')).status).toBe(200);
    expect(reportBadgeSeen).not.toHaveBeenCalled();
    for (const [task] of after.mock.calls) await task();
    expect(reportBadgeSeen).toHaveBeenCalledExactlyOnceWith('repo', 'octo/widgets');
  });
});
