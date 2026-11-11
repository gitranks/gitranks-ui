import type { Route } from 'next';

import { countriesPagePath } from './country-paths';
import type { StatsPart } from '@/components/ranking-stats/ranking-stats.utils';
import {
  biggestClimb,
  competitionRanks,
  formatShare,
  previousSnapshotDate,
  shareOf,
  snapshotMonth,
  totalOf,
} from '@/lib/rankings/summary-ranking';
import { CountrySummaryOrder, type CountrySummaryQuery } from '@/types/generated/graphql';
import { countryInSentence } from '@/utils/country-in-sentence';
import { formatSummaryDate } from '@/utils/format-summary-date';

export const COUNTRIES_PER_PAGE = 100;

type Metric = 's' | 'c' | 'f' | 'usersCount';

type OrderConfig = {
  /** The tab and the column. */
  label: string;
  metric: Metric;
  /** Whose leader the table names. */
  leader: 's' | 'c' | 'f';
  leaderLabel: string;
  /** The country's developer ranking a row opens. */
  rankingType: 'stars' | 'contributions' | 'followers';
  /** "248 countries ranked by …". */
  rankedBy: string;
  unit: string;
};

export const COUNTRY_ORDERS: Record<CountrySummaryOrder, OrderConfig> = {
  [CountrySummaryOrder.Stars]: {
    label: 'Stars',
    metric: 's',
    leader: 's',
    leaderLabel: 'Top by stars',
    rankingType: 'stars',
    rankedBy: 'the stars on repositories their developers own',
    unit: 'stars',
  },
  [CountrySummaryOrder.Contributions]: {
    label: 'Contributions',
    metric: 'c',
    leader: 'c',
    leaderLabel: 'Top contributor',
    rankingType: 'contributions',
    rankedBy: "the stars on other people's repositories their developers have merged pull requests into",
    unit: 'contribution stars',
  },
  [CountrySummaryOrder.Followers]: {
    label: 'Followers',
    metric: 'f',
    leader: 'f',
    leaderLabel: 'Most followed',
    rankingType: 'followers',
    rankedBy: 'the GitHub followers of their developers',
    unit: 'followers',
  },
  [CountrySummaryOrder.Users]: {
    label: 'Developers',
    metric: 'usersCount',
    leader: 's',
    leaderLabel: 'Top by stars',
    rankingType: 'stars',
    rankedBy: 'how many of their developers are on GitRanks',
    unit: 'developers',
  },
};

/** The tabs, in order. */
export const COUNTRY_ORDER_LIST = [
  CountrySummaryOrder.Stars,
  CountrySummaryOrder.Contributions,
  CountrySummaryOrder.Followers,
  CountrySummaryOrder.Users,
];

export const countriesPath = (order: CountrySummaryOrder, page = 1) =>
  countriesPagePath(order.toLowerCase(), page) as Route;

/** A country's developer ranking for the metric ranked. */
export const countryRankingHref = (country: string, order: CountrySummaryOrder) =>
  `/country/${encodeURIComponent(country)}/${COUNTRY_ORDERS[order].rankingType}/1` as Route;

type Summary = CountrySummaryQuery['countrySummary'][number];
type PreviousRow = { country: string; s: number; c: number; f: number; usersCount: number };

export type CountryRankingRow = {
  rank: number;
  previous: number | null;
  country: string;
  flag: string | null;
  s: number;
  c: number;
  f: number;
  usersCount: number;
  /** The ranked metric's share of all countries. */
  share: number;
  leader: { login: string; avatarUrl?: string | null } | null;
};

/** One country in the finder and the "Your country" line: every country, on any page. */
export type CountryEntry = {
  name: string;
  flag: string | null;
  /** Equal values share a rank. */
  rank: number;
  /** Its place in the list, which gives its page. */
  position: number;
  previous: number | null;
  value: number;
  usersCount: number;
};

export type CountryRanking = {
  rows: CountryRankingRow[];
  entries: CountryEntry[];
  pageCount: number;
  /** The first country's share, for the bars. */
  leadShare: number;
  countriesCount: number;
  date: string;
  facts: StatsPart[];
};

const formatNumber = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * A page of the country ranking from this month's summaries and, when readable, last month's. Equal values share a
 * rank, so ties never read as moves.
 * Null when the page is past the last country.
 */
export function buildCountryRanking(
  order: CountrySummaryOrder,
  page: number,
  summaries: readonly Summary[],
  previous: readonly PreviousRow[] | null,
): CountryRanking | null {
  const config = COUNTRY_ORDERS[order];
  const pageCount = Math.max(1, Math.ceil(summaries.length / COUNTRIES_PER_PAGE));
  if (page > pageCount) {
    return null;
  }

  const total = totalOf(summaries, (row) => row[config.metric]);
  const metricOf = (row: PreviousRow) => row[config.metric];
  const ranks = competitionRanks(summaries, (row) => row.country, metricOf);
  const previousRanks = previous ? competitionRanks(previous, (row) => row.country, metricOf) : null;

  const entries: CountryEntry[] = summaries.map((row, i) => ({
    name: row.country,
    flag: row.countryData?.flag ?? null,
    rank: ranks.get(row.country) ?? i + 1,
    position: i + 1,
    previous: previousRanks?.get(row.country) ?? null,
    value: row[config.metric],
    usersCount: row.usersCount,
  }));

  const offset = (page - 1) * COUNTRIES_PER_PAGE;
  const rows: CountryRankingRow[] = summaries.slice(offset, offset + COUNTRIES_PER_PAGE).map((row, i) => {
    const leader = row.topUsers?.[config.leader];
    return {
      rank: entries[offset + i].rank,
      previous: entries[offset + i].previous,
      country: row.country,
      flag: row.countryData?.flag ?? null,
      s: row.s,
      c: row.c,
      f: row.f,
      usersCount: row.usersCount,
      share: shareOf(row[config.metric], total),
      leader: leader?.login ? { login: leader.login, avatarUrl: leader.avatarUrl } : null,
    };
  });

  const date = summaries[0]?.date ?? '';
  const leadShare = summaries[0] ? shareOf(summaries[0][config.metric], total) : 0;

  return {
    rows,
    entries,
    pageCount,
    leadShare,
    countriesCount: summaries.length,
    date,
    facts: buildCountryFacts(order, summaries, entries, total, leadShare, previous ? previousMonth(date) : null),
  };
}

const previousMonth = (date: string) => {
  const previous = previousSnapshotDate(date);
  return previous ? snapshotMonth(previous) : null;
};

/** The ranking's facts in plain sentences, under the table. */
function buildCountryFacts(
  order: CountrySummaryOrder,
  summaries: readonly Summary[],
  entries: readonly CountryEntry[],
  total: number,
  leadShare: number,
  lastMonth: string | null,
): StatsPart[] {
  const lead = summaries[0];
  if (!lead) {
    return [];
  }

  const developers = totalOf(summaries, (row) => row.usersCount);
  const leadLink: StatsPart = { text: countryInSentence(lead.country), href: countryRankingHref(lead.country, order) };
  const share = formatShare(leadShare);
  const parts: StatsPart[] = [
    `${formatNumber(developers)} developers on GitRanks name a country, across ${formatNumber(summaries.length)} countries. `,
  ];

  switch (order) {
    case CountrySummaryOrder.Stars:
      parts.push(`The repositories they own hold ${formatNumber(total)} stars, ${share} of them in `, leadLink, '. ');
      break;
    case CountrySummaryOrder.Contributions:
      parts.push(`Their contribution stars add up to ${formatNumber(total)}, ${share} of them from `, leadLink, '. ');
      break;
    case CountrySummaryOrder.Followers:
      parts.push(`They have ${formatNumber(total)} followers between them, ${share} of them in `, leadLink, '. ');
      break;
    case CountrySummaryOrder.Users:
      parts.push(`${share} of them are in `, leadLink, '. ');
      break;
  }

  const climb = lastMonth ? biggestClimb(entries.slice(0, COUNTRIES_PER_PAGE)) : null;
  if (climb?.previous) {
    parts.push(
      `Biggest climb since ${lastMonth}: `,
      { text: climb.name, href: countryRankingHref(climb.name, order) },
      `, up ${climb.previous - climb.rank} to #${climb.rank}. `,
    );
  }

  if (lead.date) {
    parts.push(`Monthly count of ${formatSummaryDate(lead.date)}. `);
  }
  parts.push({ text: 'How rankings work', href: '/methodology' }, '.');

  return parts;
}
