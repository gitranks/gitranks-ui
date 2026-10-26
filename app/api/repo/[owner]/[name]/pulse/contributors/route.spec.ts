import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { facts } from '@/components/pulse/pulse.fixtures';

const { fetchRepoPulseContributors } = vi.hoisted(() => ({ fetchRepoPulseContributors: vi.fn() }));

vi.mock('@/graphql/helpers/fetch-repo-pulse', () => ({ fetchRepoPulseContributors }));

const { GET } = await import('./route');

const call = (owner: string, name: string, search: string) =>
  GET(new NextRequest(`https://gitranks.com/api/repo/${owner}/${name}/pulse/contributors${search}`), {
    params: Promise.resolve({ owner, name }),
  });

const rows = Array.from({ length: 5 }, (_, i) => ({
  ...facts.topContributors[0],
  githubId: String(i + 1),
  login: `dev-${i + 1}`,
}));
const table = { total: 5, unlinkedAuthors: 4, labels: ['TypeScript', 'Rust'], items: rows };

const PUBLIC_CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

describe('repo pulse contributors route', () => {
  beforeEach(() => {
    fetchRepoPulseContributors.mockReset();
  });

  it('cuts the page asked for from the whole table, cacheable by shared caches', async () => {
    fetchRepoPulseContributors.mockResolvedValue(table);

    const response = await call('octo', 'hello', '?period=LAST_60_MONTHS&sortBy=PULL_REQUESTS&first=2&offset=1');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PUBLIC_CACHE);
    expect(await response.json()).toEqual({ page: { ...table, items: rows.slice(1, 3) } });
    expect(fetchRepoPulseContributors).toHaveBeenCalledExactlyOnceWith(
      'octo',
      'hello',
      'LAST_60_MONTHS',
      'PULL_REQUESTS',
      null,
    );
  });

  it('answers the labels alone for a page of no rows', async () => {
    fetchRepoPulseContributors.mockResolvedValue(table);

    const response = await call('octo', 'hello', '?period=LAST_12_MONTHS&sortBy=LINES&first=0&offset=0');

    expect(await response.json()).toEqual({ page: { ...table, items: [] } });
  });

  it('reads a label the period lists, after the table that lists it', async () => {
    const rust = { ...table, total: 1, labels: ['TypeScript', 'Rust'], items: rows.slice(0, 1) };
    fetchRepoPulseContributors.mockImplementation(async (...args: unknown[]) => (args[4] === 'Rust' ? rust : table));

    const response = await call('octo', 'hello', '?period=LAST_3_MONTHS&sortBy=COMMITS&label=Rust&first=25&offset=0');

    expect(await response.json()).toEqual({ page: rust });
    expect(fetchRepoPulseContributors.mock.calls.map((args) => args[4])).toEqual([null, 'Rust']);
  });

  it('answers an empty page for a label the period does not list, without reading it', async () => {
    fetchRepoPulseContributors.mockResolvedValue(table);

    const response = await call('octo', 'hello', '?period=LAST_3_MONTHS&sortBy=COMMITS&label=Cobol');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      page: { total: 0, unlinkedAuthors: 0, labels: table.labels, items: [] },
    });
    expect(fetchRepoPulseContributors).toHaveBeenCalledExactlyOnceWith(
      'octo',
      'hello',
      'LAST_3_MONTHS',
      'COMMITS',
      null,
    );
  });

  it('answers a null page for a repository with no data, label or not', async () => {
    fetchRepoPulseContributors.mockResolvedValue(null);

    expect(await (await call('octo', 'hello', '?period=LAST_12_MONTHS&sortBy=LINES')).json()).toEqual({ page: null });
    expect(await (await call('octo', 'hello', '?period=LAST_12_MONTHS&sortBy=LINES&label=Rust')).json()).toEqual({
      page: null,
    });
    expect(fetchRepoPulseContributors.mock.calls.map((args) => args[4])).toEqual([null, null]);
  });

  it('refuses a repository GitHub could not name with 400, not to be stored', async () => {
    const response = await call('octo', 'hello world', '?period=LAST_12_MONTHS&sortBy=LINES');

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ message: 'Invalid repository' });
    expect(fetchRepoPulseContributors).not.toHaveBeenCalled();
  });

  it.each([
    '?sortBy=LINES',
    '?period=LAST_12_MONTHS',
    '?period=LAST_12_MONTHS&sortBy=STARS',
    '?period=LAST_12_MONTHS&sortBy=LINES&first=-5',
  ])('refuses the query "%s" with 400', async (search) => {
    const response = await call('octo', 'hello', search);

    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ message: 'Invalid query' });
    expect(fetchRepoPulseContributors).not.toHaveBeenCalled();
  });

  it('answers 502, not to be stored, when the table cannot be read', async () => {
    fetchRepoPulseContributors.mockRejectedValueOnce(new Error('GraphQL error! 500'));

    const response = await call('octo', 'hello', '?period=LAST_3_MONTHS&sortBy=COMMITS');

    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
