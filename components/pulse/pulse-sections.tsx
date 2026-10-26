import type { FC, ReactNode } from 'react';

import {
  countryRowLabel,
  formatCount,
  formatMonth,
  formatShare,
  formatSigned,
  formatUtcDay,
  type PulseCountryRow,
  type PulseFactsData,
  seriesColor,
} from './pulse.utils';
import { PulseCodeCharts } from './pulse-code-charts';
import { PulseContributorsChart } from './pulse-contributors-chart';
import { PulseContributorsTable } from './pulse-contributors-table';
import type { LoadContributorsPage } from './pulse-contributors-table.state';
import { ProfileCard, ProfileCardContent } from '@/app/profile/[login]/components/profile-card';
import { cn } from '@/lib/utils';
import { OrgPulseCountryGroup } from '@/types/generated/graphql';

/** A section card named by its heading. */
export const PulseSection: FC<{ id: string; title: string; children: ReactNode }> = ({ id, title, children }) => (
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

// The facts are server-rendered on every covered page: styles sit on the containers, so
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

const SnapshotTable: FC<{ pulse: PulseFactsData }> = ({ pulse }) => (
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

/** Lines of code: the headline numbers, the lines charts, the month-end snapshot and the scope note. */
export const PulseCodeSection: FC<{ idPrefix: string; pulse: PulseFactsData }> = ({ idPrefix, pulse }) => {
  const total = pulse.snapshot.reduce((sum, row) => sum + row.lines, 0);
  const updated = formatUtcDay(pulse.computedAt);

  return (
    <PulseSection id={`${idPrefix}-code`} title="Code">
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
        <PulseCodeCharts />
        <SnapshotTable pulse={pulse} />
        <p className="text-xs text-muted-foreground">
          {pulse.scopeNote}
          {updated && <> Updated {updated}.</>}
        </p>
      </ProfileCardContent>
    </PulseSection>
  );
};

type PulseContributorsSectionProps = {
  idPrefix: string;
  pulse: PulseFactsData;
  /** Must keep its identity across renders. */
  loadContributors: LoadContributorsPage;
};

/** Contributors: the headline numbers, contributors per month and the top contributors table. */
export const PulseContributorsSection: FC<PulseContributorsSectionProps> = ({ idPrefix, pulse, loadContributors }) => (
  <PulseSection id={`${idPrefix}-contributors`} title="Contributors">
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
        <PulseContributorsChart />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-medium">Top contributors</h3>
        <PulseContributorsTable
          initialItems={pulse.topContributors}
          initialUnlinkedAuthors={pulse.unlinkedAuthors12}
          loadPage={loadContributors}
        />
      </div>
    </ProfileCardContent>
  </PulseSection>
);

const countryKey = (row: PulseCountryRow) => `${row.group}:${row.country ?? ''}`;

type PulseCountriesSectionProps = {
  idPrefix: string;
  title: string;
  /** Who is counted, under the heading. */
  description: string;
  /** The table's name for screen readers. */
  caption: string;
  countries: PulseCountryRow[];
};

export const PulseCountriesSection: FC<PulseCountriesSectionProps> = ({
  idPrefix,
  title,
  description,
  caption,
  countries,
}) => {
  // Bars compare countries only: the two group rows have no bar, so a large one never shrinks them.
  const max = Math.max(
    1,
    ...countries.filter((row) => row.group === OrgPulseCountryGroup.Country).map((row) => row.contributors),
  );

  return (
    <PulseSection id={`${idPrefix}-countries`} title={title}>
      <ProfileCardContent className="gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        <table
          className={cn(
            TABLE_CLASSNAME,
            '[&_i]:block [&_i]:h-1 [&_i]:mt-1 [&_i]:rounded-full [&_i]:bg-[var(--series-1)]',
          )}
        >
          <caption className="sr-only">{caption}</caption>
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
    </PulseSection>
  );
};
