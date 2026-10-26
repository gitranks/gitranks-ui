import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BadgeRepoQuery } from '@/types/generated/graphql';

const fetchBadgeRepo = vi.fn<(owner: string, name: string) => Promise<BadgeRepoQuery['repo']>>();
vi.mock('./star-history-badge.loader', () => ({ fetchBadgeRepo }));

const { getStarHistoryBadgeResponse, parseStarHistoryFile, STAR_HISTORY_CACHE_CONTROL } = await import(
  './star-history-badge'
);

const history = {
  points: [
    { date: '2024-02-10T00:00:00Z', stars: 0 },
    { date: '2024-03-01T00:00:00Z', stars: 25 },
  ],
  current: { date: '2024-03-04T00:00:00Z', stars: 31 },
};

const repo = (overrides: Partial<NonNullable<BadgeRepoQuery['repo']>> = {}) => ({
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
    expect(response.headers.get('cache-control')).toBe(STAR_HISTORY_CACHE_CONTROL.notFound);
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
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800',
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
    expect(response.headers.get('cache-control')).toBe(STAR_HISTORY_CACHE_CONTROL.chart);
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
