import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { series } from '@/components/pulse/pulse.fixtures';

const { fetchRepoPulseSeries } = vi.hoisted(() => ({ fetchRepoPulseSeries: vi.fn() }));

vi.mock('@/graphql/helpers/fetch-repo-pulse', () => ({ fetchRepoPulseSeries }));

const { GET } = await import('./route');

const call = (owner: string, name: string, search: string) =>
  GET(new NextRequest(`https://gitranks.com/api/repo/${owner}/${name}/pulse/series${search}`), {
    params: Promise.resolve({ owner, name }),
  });

describe('repo pulse series route', () => {
  beforeEach(() => {
    fetchRepoPulseSeries.mockReset();
  });

  it('answers the series of the grouping asked for', async () => {
    fetchRepoPulseSeries.mockResolvedValueOnce(series);

    const response = await call('Octo-Org', 'hello.world', '?groupBy=LANGUAGE');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ series });
    expect(fetchRepoPulseSeries).toHaveBeenCalledWith('Octo-Org', 'hello.world', 'LANGUAGE');
  });

  it('answers a null series for a repository with no data', async () => {
    fetchRepoPulseSeries.mockResolvedValueOnce(null);

    expect(await (await call('octo', 'hello', '?groupBy=TYPE')).json()).toEqual({ series: null });
  });

  it.each([
    ['-octo', 'hello'],
    ['octo', 'hello world'],
    ['octo', '%E0%A4%A'],
  ])('refuses %s/%s with 400, without reading the series', async (owner, name) => {
    const response = await call(owner, name, '?groupBy=TYPE');

    expect(response.status).toBe(400);
    expect(fetchRepoPulseSeries).not.toHaveBeenCalled();
  });

  it.each(['', '?groupBy=type', '?groupBy=STARS'])('refuses the query "%s" with 400', async (search) => {
    const response = await call('octo', 'hello', search);

    expect(response.status).toBe(400);
    expect(fetchRepoPulseSeries).not.toHaveBeenCalled();
  });

  it('answers 502 when the series cannot be read', async () => {
    fetchRepoPulseSeries.mockRejectedValueOnce(new Error('GraphQL error! 500'));

    const response = await call('octo', 'hello', '?groupBy=KIND');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ message: 'Failed to load the series' });
  });
});
