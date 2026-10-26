import type { PulseSeriesData } from '@/components/pulse/pulse.utils';
import type { ContributorsPage, LoadContributorsPage } from '@/components/pulse/pulse-contributors-table.state';
import type { LoadPulseSeries } from '@/components/pulse/pulse-series-provider';
import { getRepoPulseContributorsUrl, getRepoPulseSeriesUrl } from '@/utils/repo-pulse';

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

/** The repository's series and contributor pages, read through this site's API routes. */
export function repoPulseLoaders(owner: string, name: string) {
  const loadSeries: LoadPulseSeries = (groupBy) =>
    readJson<{ series: PulseSeriesData | null }>(getRepoPulseSeriesUrl(owner, name, groupBy)).then(
      ({ series }) => series,
    );
  const loadContributors: LoadContributorsPage = (query, offset, first) =>
    readJson<{ page: ContributorsPage | null }>(
      getRepoPulseContributorsUrl(owner, name, { ...query, first, offset }),
    ).then(({ page }) => page);

  return { loadSeries, loadContributors };
}
