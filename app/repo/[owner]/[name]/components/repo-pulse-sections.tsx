'use client';

import { type FC, useMemo } from 'react';

import { repoPulseLoaders } from './repo-pulse-loaders';
import { ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import type { PulseFactsData } from '@/components/pulse/pulse.utils';
import { PulseCodeSection, PulseContributorsSection, PulseCountriesSection } from '@/components/pulse/pulse-sections';
import { PulseSeriesProvider } from '@/components/pulse/pulse-series-provider';

const ID_PREFIX = 'repo-pulse';

type RepoPulseSectionsProps = {
  owner: string;
  name: string;
  pulse: PulseFactsData;
};

/**
 * Code and contributor analytics on the repository page: the facts are server-rendered, and the
 * series and the contributor table's other pages load in the browser. Data only, no score.
 */
export const RepoPulseSections: FC<RepoPulseSectionsProps> = ({ owner, name, pulse }) => {
  const { loadSeries, loadContributors } = useMemo(() => repoPulseLoaders(owner, name), [owner, name]);

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
