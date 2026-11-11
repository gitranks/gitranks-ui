import type { Route } from 'next';

import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';
import type { StatsPart } from '@/components/ranking-stats/ranking-stats.utils';
import {
  biggestClimb,
  findStandOuts,
  formatShare,
  positionsByName,
  previousSnapshotDate,
  shareOf,
  snapshotMonth,
  totalOf,
} from '@/lib/rankings/summary-ranking';
import {
  type CountryLanguageSummaryQuery,
  LanguageSummaryOrder,
  type LanguageSummaryQuery,
} from '@/types/generated/graphql';
import { countryInSentence } from '@/utils/country-in-sentence';
import { formatBytes } from '@/utils/format-bytes';
import { formatSummaryDate } from '@/utils/format-summary-date';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { GLOBAL_SCOPE } from '@/utils/global-scope';

export const LANGUAGES_PER_PAGE = 100;

type Metric = 'score' | 'usersCount' | 'size';

type OrderConfig = { label: string; metric: Metric; rankedBy: string; showShare: boolean };

export const LANGUAGE_ORDERS: Record<LanguageSummaryOrder, OrderConfig> = {
  [LanguageSummaryOrder.Score]: {
    label: 'Stars',
    metric: 'score',
    rankedBy: 'the stars of the repositories written in them',
    showShare: true,
  },
  [LanguageSummaryOrder.Users]: {
    label: 'Developers',
    metric: 'usersCount',
    rankedBy: 'how many developers have them among their top 5',
    // A developer counts in up to 5 languages, so shares of the sum would mislead.
    showShare: false,
  },
  [LanguageSummaryOrder.Size]: {
    label: 'Code size',
    metric: 'size',
    rankedBy: 'how much code is written in them',
    showShare: true,
  },
};

/** The tabs, in order. */
export const LANGUAGE_ORDER_LIST = [LanguageSummaryOrder.Score, LanguageSummaryOrder.Users, LanguageSummaryOrder.Size];

/** A language summary page: `scope` is `global` or a country's name. */
export const languagesPath = (scope: string, order: LanguageSummaryOrder, page = 1) =>
  `/languages/${encodeURIComponent(scope)}/${order.toLowerCase()}/${page}` as Route;

/** A number in the metric's own unit: bytes for code size. */
export const formatMetric = (metric: Metric, value: number) =>
  metric === 'size' ? formatBytes(value) : Math.round(value).toLocaleString('en-US');

type PageRow =
  | LanguageSummaryQuery['languageSummary'][number]
  | CountryLanguageSummaryQuery['countryLanguageSummary'][number];
type RankRow = { language: string; date: string; usersCount: number; score: number; size: number };

export type LanguageRankingRow = {
  rank: number;
  previous: number | null;
  language: string;
  color: string;
  score: number;
  size: number;
  usersCount: number;
  share: number;
  /** Its place worldwide, in a country's ranking. */
  worldRank: number | null;
  leader: { login: string; avatarUrl?: string | null } | null;
};

export type LanguageStandOut = {
  kind: 'above-world' | 'climb';
  row: LanguageRankingRow;
};

export type LanguageRanking = {
  rows: LanguageRankingRow[];
  pageCount: number;
  leadShare: number;
  languagesCount: number;
  date: string;
  standOuts: LanguageStandOut[];
  facts: StatsPart[];
};

type BuildInput = {
  /** `global` or a country's name. */
  scope: string;
  order: LanguageSummaryOrder;
  page: number;
  /** Every language this month, in ranking order. */
  all: readonly RankRow[];
  /** This page's rows, with their leaders and colours. */
  pageRows: readonly PageRow[];
  /** Every language last month, in the same order; null when unreadable. */
  previous: readonly RankRow[] | null;
  /** Every language worldwide this month, in the same order, for a country's ranking. */
  world: readonly RankRow[] | null;
};

const full = (n: number) => Math.round(n).toLocaleString('en-US');

/** A page of a language ranking. Null when the page is past the last language. */
export function buildLanguageRanking({
  scope,
  order,
  page,
  all,
  pageRows,
  previous,
  world,
}: BuildInput): LanguageRanking | null {
  const config = LANGUAGE_ORDERS[order];
  const pageCount = Math.max(1, Math.ceil(all.length / LANGUAGES_PER_PAGE));
  if (page > pageCount) {
    return null;
  }

  const total = totalOf(all, (row) => row[config.metric]);
  const ranks = positionsByName(all, (row) => row.language);
  const previousRanks = previous ? positionsByName(previous, (row) => row.language) : null;
  const worldRanks = world ? positionsByName(world, (row) => row.language) : null;
  const offset = (page - 1) * LANGUAGES_PER_PAGE;

  const rows: LanguageRankingRow[] = pageRows.map((row, i) => ({
    rank: ranks.get(row.language) ?? offset + i + 1,
    previous: previousRanks?.get(row.language) ?? null,
    language: row.language,
    color: row.languageData?.color || DEFAULT_LANGUAGE_COLOR,
    score: row.score,
    size: row.size,
    usersCount: row.usersCount,
    share: shareOf(row[config.metric], total),
    worldRank: worldRanks?.get(row.language) ?? null,
    leader: row.topUser?.login ? { login: row.topUser.login, avatarUrl: row.topUser.avatarUrl } : null,
  }));

  const date = all[0]?.date ?? '';
  const leadShare = all[0] ? shareOf(all[0][config.metric], total) : 0;
  const isCountry = scope !== GLOBAL_SCOPE;

  const standOuts: LanguageStandOut[] =
    isCountry && page === 1 && worldRanks ? findStandOuts(rows).map(({ kind, row }) => ({ kind, row })) : [];

  return {
    rows,
    pageCount,
    leadShare,
    languagesCount: all.length,
    date,
    standOuts,
    facts: buildLanguageFacts({ scope, order, all, rows, total, leadShare, date, hasPrevious: !!previous }),
  };
}

function buildLanguageFacts({
  scope,
  order,
  all,
  rows,
  total,
  leadShare,
  date,
  hasPrevious,
}: {
  scope: string;
  order: LanguageSummaryOrder;
  all: readonly RankRow[];
  rows: readonly LanguageRankingRow[];
  total: number;
  leadShare: number;
  date: string;
  hasPrevious: boolean;
}): StatsPart[] {
  const lead = all[0];
  if (!lead) {
    return [];
  }

  const isCountry = scope !== GLOBAL_SCOPE;
  const where = isCountry ? `in ${countryInSentence(scope)}` : 'on GitRanks';
  const leadLink: StatsPart = { text: lead.language, href: getLanguageRankingPath(lead.language, scope) };
  const share = formatShare(leadShare);
  const parts: StatsPart[] = [];

  switch (order) {
    case LanguageSummaryOrder.Score:
      parts.push(
        `${full(all.length)} languages hold ${full(total)} stars on the repositories of developers ${where}; `,
        leadLink,
        ` leads with ${share}. A repository's stars are split by its language mix: 100 stars on a repository that is 60% JavaScript give JavaScript 60. `,
      );
      break;
    case LanguageSummaryOrder.Size:
      parts.push(
        `${full(all.length)} languages make up ${formatBytes(total)} of code in the public repositories of developers ${where}; `,
        leadLink,
        ` leads with ${share}. `,
      );
      break;
    case LanguageSummaryOrder.Users:
      parts.push(
        'Each developer counts in their top 5 languages by stars. ',
        leadLink,
        ` is among them for ${full(lead.usersCount)} developers ${where}. `,
      );
      break;
  }

  const lastMonthDate = hasPrevious ? previousSnapshotDate(date) : null;
  const climb = lastMonthDate ? biggestClimb(rows) : null;
  if (lastMonthDate && climb?.previous) {
    parts.push(
      `Biggest climb since ${snapshotMonth(lastMonthDate)}: `,
      { text: climb.language, href: getLanguageRankingPath(climb.language, scope) },
      `, up ${climb.previous - climb.rank} to #${climb.rank}. `,
    );
  }

  if (date) {
    parts.push(`Monthly count of ${formatSummaryDate(date)}. `);
  }
  if (isCountry) {
    parts.push(
      { text: 'All developers', href: languagesPath(GLOBAL_SCOPE, order) },
      ' · ',
      { text: `${scope}'s developers`, href: `/country/${encodeURIComponent(scope)}/stars/1` as Route },
      ' · ',
    );
  }
  parts.push({ text: 'How rankings work', href: '/methodology' }, '.');

  return parts;
}
