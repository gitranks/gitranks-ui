import type { OrgFacts, RepoFacts } from './facts';
import { formatFull, mono, segment, text } from './format';
import { shortNameOfMonth } from './month';
import type { ContributorKey, Segment } from './types';

export const CONTRIBUTOR_KEYS = [
  '12mo',
  'month',
  'new',
  '5yr',
  'countries',
  'legends',
] as const satisfies readonly ContributorKey[];

/** Organizations have no Built by, so no Legends count. */
export const ORG_CONTRIBUTOR_KEYS = CONTRIBUTOR_KEYS.filter((key) => key !== 'legends');

export const DEFAULT_CONTRIBUTOR_VALUE: ContributorKey = '12mo';
export const DEFAULT_CONTRIBUTOR_EXTRA: ContributorKey = 'countries';

const LEGEND = 7;

/** The last completed month's active contributors and newcomers, from the series' last point. */
function lastMonthOf(entity: RepoFacts | OrgFacts) {
  const series = entity.pulseSeries;
  if (!series?.months.length) {
    return null;
  }
  const last = series.months.length - 1;
  return {
    active: (series.activeLinked[last] ?? 0) + (series.activeAnonymous[last] ?? 0),
    newcomers: series.newContributors[last] ?? null,
    name: shortNameOfMonth(entity.pulse?.lastMonth ?? series.months[last]),
  };
}

/** The number a contributor key counts, or `null` when the entity does not have it. */
export function contributorCount(entity: RepoFacts | OrgFacts, key: ContributorKey): number | null {
  const { pulse } = entity;
  if (!pulse) {
    return null;
  }
  switch (key) {
    case '12mo':
      return pulse.active12;
    case 'month':
      return lastMonthOf(entity)?.active ?? null;
    case 'new':
      return lastMonthOf(entity)?.newcomers ?? null;
    case '5yr':
      return pulse.contributors60 ?? null;
    case 'countries':
      return pulse.countryCount ?? null;
    case 'legends':
      return entity.kind === 'repo' ? (entity.builtBy?.find(({ tier }) => tier === LEGEND)?.count ?? 0) : null;
  }
}

/**
 * The text of a contributor key: "186 in 12 mo", "41 in Sep", "+6 new in Sep", "2,410 in 5 yrs", "23 countries",
 * "3 Legends". `null` when the entity does not have the fact.
 */
export function contributorSegment(entity: RepoFacts | OrgFacts, key: ContributorKey): Segment | null {
  const count = contributorCount(entity, key);
  if (count === null) {
    return null;
  }
  const amount = formatFull(count);
  const monthName = lastMonthOf(entity)?.name ?? 'last month';

  switch (key) {
    case '12mo':
      return segment(mono(amount), text(' in 12 mo'));
    case 'month':
      return segment(mono(amount), text(` in ${monthName}`));
    case 'new':
      return count > 0
        ? segment(mono(`+${amount}`, 'positive'), text(` new in ${monthName}`, 'positive'))
        : segment(mono(amount), text(` new in ${monthName}`));
    case '5yr':
      return segment(mono(amount), text(' in 5 yrs'));
    case 'countries':
      return segment(mono(amount), text(count === 1 ? ' country' : ' countries'));
    case 'legends':
      return {
        icon: { kind: 'user-tier', tier: LEGEND },
        tone: 'gold',
        runs: [mono(amount), text(count === 1 ? ' Legend' : ' Legends')],
      };
  }
}
