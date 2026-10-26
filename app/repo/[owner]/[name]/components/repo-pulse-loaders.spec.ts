import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { repoPulseLoaders } from './repo-pulse-loaders';
import { series } from '@/components/pulse/pulse.fixtures';
import { OrgActivityGroupBy, OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';

const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(Response.json(body, { status }));

const query = { period: OrgPulsePeriod.Last_3Months, sortBy: OrgPulseContributorSort.Commits, label: 'Rust' };
const page = { total: 1, unlinkedAuthors: 0, labels: ['Rust'], items: [] };

describe('repoPulseLoaders', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads a grouping from the series route and unwraps it', async () => {
    answer({ series });

    await expect(repoPulseLoaders('octo-org', 'hello.world').loadSeries(OrgActivityGroupBy.Kind)).resolves.toEqual(
      series,
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/repo/octo-org/hello.world/pulse/series?groupBy=KIND');
  });

  it('reads a page from the contributors route and unwraps it', async () => {
    answer({ page });

    await expect(repoPulseLoaders('octo', 'hello').loadContributors(query, 25, 50)).resolves.toEqual(page);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/repo/octo/hello/pulse/contributors?period=LAST_3_MONTHS&sortBy=COMMITS&first=50&offset=25&label=Rust',
    );
  });

  it('passes on no data as null', async () => {
    answer({ series: null });
    answer({ page: null });

    const { loadSeries, loadContributors } = repoPulseLoaders('octo', 'hello');

    await expect(loadSeries(OrgActivityGroupBy.Type)).resolves.toBeNull();
    await expect(loadContributors(query, 0, 25)).resolves.toBeNull();
  });

  it('throws on a failed answer, so the section shows its error', async () => {
    answer({ message: 'Failed to load the series' }, 502);
    answer({ message: 'Invalid query' }, 400);

    const { loadSeries, loadContributors } = repoPulseLoaders('octo', 'hello');

    await expect(loadSeries(OrgActivityGroupBy.Type)).rejects.toThrow('Request failed (502)');
    await expect(loadContributors(query, 0, 25)).rejects.toThrow('Request failed (400)');
  });
});
