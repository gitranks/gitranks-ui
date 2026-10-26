'use client';

import { type FC, useMemo } from 'react';

import { ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import type { PulseFactsData, PulseSeriesData } from '@/components/pulse/pulse.utils';
import type { ContributorsPage, LoadContributorsPage } from '@/components/pulse/pulse-contributors-table.state';
import { PulseCodeSection, PulseContributorsSection, PulseCountriesSection } from '@/components/pulse/pulse-sections';
import { type LoadPulseSeries, PulseSeriesProvider } from '@/components/pulse/pulse-series-provider';
import { getRepoPulseContributorsUrl, getRepoPulseSeriesUrl } from '@/utils/repo-pulse';

const ID_PREFIX = 'repo-pulse';

type RepoPulseSectionsProps = {
  owner: string;
  name: string;
  pulse: PulseFactsData;
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

const useRepoLoaders = (owner: string, name: string) =>
  useMemo(() => {
    const loadSeries: LoadPulseSeries = (groupBy) =>
      readJson<{ series: PulseSeriesData | null }>(getRepoPulseSeriesUrl(owner, name, groupBy)).then(
        ({ series }) => series,
      );
    const loadContributors: LoadContributorsPage = (query, offset, first) =>
      readJson<{ page: ContributorsPage | null }>(
        getRepoPulseContributorsUrl(owner, name, { ...query, first, offset }),
      ).then(({ page }) => page);

    return { loadSeries, loadContributors };
  }, [owner, name]);

/**
 * Code and contributor analytics on the repository page: the facts are server-rendered, and the
 * series and the contributor table's other pages load in the browser. Data only, no score.
 */
export const RepoPulseSections: FC<RepoPulseSectionsProps> = ({ owner, name, pulse }) => {
  const { loadSeries, loadContributors } = useRepoLoaders(owner, name);

  return (
    <>
      <PulseSeriesProvider scope={`${owner}/${name}`} loadSeries={loadSeries}>
        <PulseCodeSection idPrefix={ID_PREFIX} pulse={pulse} />
        <PulseContributorsSection idPrefix={ID_PREFIX} pulse={pulse} loadContributors={loadContributors} />
      </PulseSeriesProvider>
      {!!pulse.countries.length && (
        <ProfileCardsGrid>
          <PulseCountriesSection
            idPrefix={ID_PREFIX}
            title="Top contributors' countries"
            description="The repository's top contributors active in the last 12 months, by the country on their gitranks profile. Other contributors are not counted here."
            caption="Top contributors by country, last 12 months"
            countries={pulse.countries}
          />
        </ProfileCardsGrid>
      )}
    </>
  );
};
