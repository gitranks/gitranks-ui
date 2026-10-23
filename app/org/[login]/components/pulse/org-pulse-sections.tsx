'use client';

import NextLink from 'next/link';
import type { FC, ReactNode } from 'react';

import {
  avatarSrc,
  countryRowLabel,
  formatCount,
  formatMonth,
  formatShare,
  formatSigned,
  formatUtcDay,
  type OrgPulseCountryRow,
  type OrgPulseFactsData,
  type OrgPulseSharedOrgRow,
  plural,
  seriesColor,
} from './org-pulse.utils';
import { OrgPulseCodeCharts } from './org-pulse-code-charts';
import { OrgPulseContributorsChart } from './org-pulse-contributors-chart';
import { OrgPulseContributorsTable } from './org-pulse-contributors-table';
import { OrgPulseSeriesProvider } from './org-pulse-series-provider';
import { OrgPulseSharedGraph } from './org-pulse-shared-graph';
import { useHydrated } from './use-hydrated';
import { ProfileCard, ProfileCardContent, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { cn } from '@/lib/utils';
import { OrgPulseCountryGroup } from '@/types/generated/graphql';

type OrgPulseSectionsProps = {
  login: string;
  avatarUrl?: string | null;
  pulse: OrgPulseFactsData;
};

/** A section card named by its heading. */
const Section: FC<{ id: string; title: string; children: ReactNode }> = ({ id, title, children }) => (
  <section aria-labelledby={id} className="min-w-0">
    <ProfileCard className="h-full gap-4">
      <h2 id={id} className="text-lg leading-none">
        {title}
      </h2>
      {children}
    </ProfileCard>
  </section>
);

type Fact = { label: string; value: string; className?: string };

// The facts are server-rendered on every covered org's page: styles sit on the containers, so
// rows and cells carry no class lists of their own.
const FACTS_CLASSNAME =
  'grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 [&>div]:flex [&>div]:flex-col-reverse [&>div]:justify-end [&>div]:gap-0.5 [&_dt]:text-xs [&_dt]:text-muted-foreground [&_dd]:text-xl [&_dd]:font-semibold [&_dd]:tabular-nums';
const TABLE_CLASSNAME =
  'w-full text-sm [&_thead]:text-xs [&_thead]:text-muted-foreground [&_th]:font-normal [&_th]:text-left [&_thead_th]:pb-1 [&_tbody_tr]:border-t [&_tbody_th]:py-1 [&_td]:py-1 [&_td]:pl-3 [&_td]:text-right [&_td]:tabular-nums [&_thead_th+th]:pl-3 [&_thead_th+th]:text-right';

/** Headline numbers as a definition list: the label under the value, no reading of them. */
const Facts: FC<{ facts: Fact[]; label: string }> = ({ facts, label }) => (
  <dl aria-label={label} className={FACTS_CLASSNAME}>
    {facts.map((fact) => (
      <div key={fact.label}>
        <dt>{fact.label}</dt>
        <dd className={fact.className}>{fact.value}</dd>
      </div>
    ))}
  </dl>
);

const SnapshotTable: FC<{ pulse: OrgPulseFactsData }> = ({ pulse }) => (
  <div className="overflow-x-auto">
    <table className={cn(TABLE_CLASSNAME, '[&_i]:mr-2 [&_i]:inline-block [&_i]:size-3 [&_i]:rounded-sm')}>
      <caption className="pb-2 text-left font-medium">Lines of code by type, {formatMonth(pulse.lastMonth)}</caption>
      <thead>
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Lines</th>
          <th scope="col">Share</th>
        </tr>
      </thead>
      <tbody>
        {pulse.snapshot.map((row, i) => (
          <tr key={row.label}>
            <th scope="row">
              <i aria-hidden style={{ backgroundColor: seriesColor(row.label, i) }} />
              {row.label}
            </th>
            <td>{formatCount(row.lines)}</td>
            <td>{formatShare(row.share)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CodeSection: FC<{ pulse: OrgPulseFactsData }> = ({ pulse }) => {
  const total = pulse.snapshot.reduce((sum, row) => sum + row.lines, 0);
  const updated = formatUtcDay(pulse.computedAt);

  return (
    <Section id="org-pulse-code" title="Code">
      <ProfileCardContent className="gap-5">
        <Facts
          label="Lines of code"
          facts={[
            { label: `Lines of code, ${formatMonth(pulse.lastMonth)}`, value: formatCount(total) },
            {
              label: 'Lines added, last 12 months',
              value: `+${formatCount(pulse.last12.added)}`,
              className: 'text-positive',
            },
            {
              label: 'Lines deleted, last 12 months',
              value: `−${formatCount(pulse.last12.deleted)}`,
              className: 'text-negative',
            },
            { label: 'Net, last 12 months', value: formatSigned(pulse.last12.net) },
          ]}
        />
        <OrgPulseCodeCharts />
        <SnapshotTable pulse={pulse} />
        <p className="text-xs text-muted-foreground">
          {pulse.scopeNote}
          {updated && <> Updated {updated}.</>}
        </p>
      </ProfileCardContent>
    </Section>
  );
};

const ContributorsSection: FC<{ login: string; pulse: OrgPulseFactsData }> = ({ login, pulse }) => (
  <Section id="org-pulse-contributors" title="Contributors">
    <ProfileCardContent className="gap-5">
      <Facts
        label="Contributors, last 12 months"
        facts={[
          { label: 'Active contributors, last 12 months', value: formatCount(pulse.last12.activeContributors) },
          { label: 'First-time contributors, last 12 months', value: formatCount(pulse.last12.newContributors) },
          { label: 'Commits, last 12 months', value: formatCount(pulse.last12.commits) },
          { label: 'Pull requests merged, last 12 months', value: formatCount(pulse.last12.pullRequests) },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        People only: bots are not counted here. A merged pull request counts once, at its merge date.
      </p>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Contributors per month</h3>
        <OrgPulseContributorsChart />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Top contributors</h3>
        <OrgPulseContributorsTable
          login={login}
          initialItems={pulse.topContributors}
          initialUnlinkedAuthors={pulse.unlinkedAuthors12}
        />
      </div>
    </ProfileCardContent>
  </Section>
);

const countryKey = (row: OrgPulseCountryRow) => `${row.group}:${row.country ?? ''}`;

const CountriesSection: FC<{ countries: OrgPulseCountryRow[] }> = ({ countries }) => {
  // Bars compare countries only: the two group rows have no bar, so a large one never shrinks them.
  const max = Math.max(
    1,
    ...countries.filter((row) => row.group === OrgPulseCountryGroup.Country).map((row) => row.contributors),
  );

  return (
    <Section id="org-pulse-countries" title="Contributors by country">
      <ProfileCardContent className="gap-3">
        <p className="text-sm text-muted-foreground">
          Linked contributors active in the last 12 months, by the country on their gitranks profile.
        </p>
        <table
          className={cn(
            TABLE_CLASSNAME,
            '[&_i]:block [&_i]:h-1 [&_i]:mt-1 [&_i]:rounded-full [&_i]:bg-[var(--series-1)]',
          )}
        >
          <caption className="sr-only">Contributors by country, last 12 months</caption>
          <thead className="sr-only">
            <tr>
              <th scope="col">Country</th>
              <th scope="col">Contributors</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((row) => {
              const grouped = row.group !== OrgPulseCountryGroup.Country;
              return (
                <tr key={countryKey(row)} className={grouped ? 'text-muted-foreground' : undefined}>
                  <th scope="row">
                    {row.flag && (
                      <span aria-hidden className="mr-1.5">
                        {row.flag}
                      </span>
                    )}
                    {countryRowLabel(row)}
                    {!grouped && <i aria-hidden style={{ width: `${(100 * row.contributors) / max}%` }} />}
                  </th>
                  <td className="align-top">{formatCount(row.contributors)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ProfileCardContent>
    </Section>
  );
};

const SharedSection: FC<{ login: string; avatarUrl?: string | null; orgs: OrgPulseSharedOrgRow[] }> = ({
  login,
  avatarUrl,
  orgs,
}) => {
  // The graph is decorative (the list holds its numbers): drawn in the browser only, its square kept.
  const hydrated = useHydrated();

  return (
    <Section id="org-pulse-shared" title="Shared contributors">
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
    </Section>
  );
};

/**
 * Org Pulse on the org page: the facts are rendered on the server into the HTML (crawlable, small),
 * and the 60-month series and the contributor table's other pages load in the browser. One client
 * boundary: the page hands it the facts as data, so the payload React hydrates from carries the
 * facts once, not their markup. Data only: counts and shares, no headline, conclusion or score.
 */
export const OrgPulseSections: FC<OrgPulseSectionsProps> = ({ login, avatarUrl, pulse }) => (
  <>
    <OrgPulseSeriesProvider login={login}>
      <CodeSection pulse={pulse} />
      <ContributorsSection login={login} pulse={pulse} />
    </OrgPulseSeriesProvider>
    {(!!pulse.countries.length || !!pulse.sharedContributorOrgs.length) && (
      <ProfileCardsGrid>
        {!!pulse.countries.length && <CountriesSection countries={pulse.countries} />}
        {!!pulse.sharedContributorOrgs.length && (
          <SharedSection login={login} avatarUrl={avatarUrl} orgs={pulse.sharedContributorOrgs} />
        )}
      </ProfileCardsGrid>
    )}
  </>
);
