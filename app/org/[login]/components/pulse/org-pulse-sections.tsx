'use client';

import NextLink from 'next/link';
import { type FC, useMemo } from 'react';

import { orgPulseLoaders } from './org-pulse-loaders';
import { OrgPulseSharedGraph, type OrgPulseSharedOrgRow } from './org-pulse-shared-graph';
import { ProfileCardContent, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { avatarSrc, formatShare, plural } from '@/components/pulse/pulse.utils';
import {
  PulseCodeSection,
  PulseContributorsSection,
  PulseCountriesSection,
  PulseSection,
} from '@/components/pulse/pulse-sections';
import { PulseSeriesProvider } from '@/components/pulse/pulse-series-provider';
import { useHydrated } from '@/components/pulse/use-hydrated';
import type { PageOrgQuery } from '@/types/generated/graphql';

export type OrgPulseFactsData = NonNullable<NonNullable<PageOrgQuery['organization']>['pulse']>;

const ID_PREFIX = 'org-pulse';

type OrgPulseSectionsProps = {
  login: string;
  avatarUrl?: string | null;
  pulse: OrgPulseFactsData;
};

const SharedSection: FC<{ login: string; avatarUrl?: string | null; orgs: OrgPulseSharedOrgRow[] }> = ({
  login,
  avatarUrl,
  orgs,
}) => {
  // The graph is decorative (the list holds its numbers): drawn in the browser only, its square kept.
  const hydrated = useHydrated();

  return (
    <PulseSection id="org-pulse-shared" title="Shared contributors">
      <ProfileCardContent className="gap-3">
        <p className="text-sm text-muted-foreground">
          Organizations where this organization&apos;s contributors of the last 12 months (2 or more changes) also
          contributed.
        </p>
        <div className="flex flex-col items-center gap-4">
          {hydrated ? (
            <OrgPulseSharedGraph login={login} avatarUrl={avatarUrl} orgs={orgs} />
          ) : (
            <div aria-hidden className="aspect-square w-full max-w-52" />
          )}
          <ul className="flex w-full min-w-0 flex-1 flex-col gap-2" aria-labelledby="org-pulse-shared">
            {orgs.map((org) => (
              <li key={org.login} className="flex items-center gap-2 text-sm">
                {org.organization?.avatarUrl ? (
                  <img
                    src={avatarSrc(org.organization.avatarUrl, 28)}
                    alt=""
                    width={28}
                    height={28}
                    loading="lazy"
                    className="rounded-full"
                  />
                ) : (
                  <i aria-hidden className="size-7 shrink-0 rounded-full bg-muted" />
                )}
                <span className="flex min-w-0 flex-col">
                  <NextLink
                    href={`/org/${org.login}`}
                    prefetch={false}
                    className="text-link hover:underline"
                    translate="no"
                  >
                    {org.organization?.name || org.login}
                  </NextLink>
                  <span className="text-xs text-muted-foreground">
                    {plural(org.sharedContributors, 'shared contributor')} ({formatShare(org.share)} of this
                    organization&apos;s)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ProfileCardContent>
    </PulseSection>
  );
};

/**
 * Org Pulse on the org page: the facts are rendered on the server into the HTML (crawlable, small),
 * and the 60-month series and the contributor table's other pages load in the browser. One client
 * boundary: the page hands it the facts as data, so the payload React hydrates from carries the
 * facts once, not their markup. Data only: counts and shares, no headline, conclusion or score.
 */
export const OrgPulseSections: FC<OrgPulseSectionsProps> = ({ login, avatarUrl, pulse }) => {
  const { loadSeries, loadContributors } = useMemo(() => orgPulseLoaders(login), [login]);

  return (
    <>
      <PulseSeriesProvider scope={login} loadSeries={loadSeries}>
        <PulseCodeSection idPrefix={ID_PREFIX} pulse={pulse} />
        <PulseContributorsSection idPrefix={ID_PREFIX} pulse={pulse} loadContributors={loadContributors} />
      </PulseSeriesProvider>
      {(!!pulse.countries.length || !!pulse.sharedContributorOrgs.length) && (
        <ProfileCardsGrid>
          {!!pulse.countries.length && (
            <PulseCountriesSection
              idPrefix={ID_PREFIX}
              title="Contributors by country"
              description="Linked contributors active in the last 12 months, by the country on their gitranks profile."
              caption="Contributors by country, last 12 months"
              countries={pulse.countries}
            />
          )}
          {!!pulse.sharedContributorOrgs.length && (
            <SharedSection login={login} avatarUrl={avatarUrl} orgs={pulse.sharedContributorOrgs} />
          )}
        </ProfileCardsGrid>
      )}
    </>
  );
};
