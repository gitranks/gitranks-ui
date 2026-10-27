'use client';

import { type FC, useMemo } from 'react';

import { repoPulseLoaders } from './repo-pulse-loaders';
import { ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { type PulseFactsData, seriesFrom } from '@/components/pulse/pulse.utils';
import { PulseCodeSection, PulseContributorsSection, PulseCountriesSection } from '@/components/pulse/pulse-sections';
import { PulseSeriesProvider } from '@/components/pulse/pulse-series-provider';

const ID_PREFIX = 'repo-pulse';

type RepoPulseSectionsProps = {
  owner: string;
  name: string;
  /** When the repository was created: the charts start in January of that year. */
  createdAt?: string | null;
  pulse: PulseFactsData;
};

/**
 * Code and contributor analytics on the repository page: the facts are server-rendered, and the
 * series and the contributor table's other pages load in the browser. Data only, no score.
 */
export const RepoPulseSections: FC<RepoPulseSectionsProps> = ({ owner, name, createdAt, pulse }) => {
  const { loadSeries, loadContributors } = useMemo(() => {
    const loaders = repoPulseLoaders(owner, name);
    // The series hold the last 60 months; a younger repository's months before its creation year are empty.
    const firstMonth = createdAt ? `${String(createdAt).slice(0, 4)}-01` : null;
    if (!firstMonth) return loaders;
    return {
      ...loaders,
      loadSeries: (groupBy: Parameters<typeof loaders.loadSeries>[0]) =>
        loaders.loadSeries(groupBy).then((series) => series && seriesFrom(series, firstMonth)),
    };
  }, [owner, name, createdAt]);

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
