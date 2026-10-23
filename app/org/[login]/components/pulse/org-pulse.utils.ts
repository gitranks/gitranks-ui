import {
  OrgActivityGroupBy,
  OrgPulseContributorSort,
  OrgPulseCountryGroup,
  OrgPulsePeriod,
  type OrgPulseSeriesQuery,
  type PageOrgQuery,
} from '@/types/generated/graphql';

export type OrgPulseSeriesData = NonNullable<NonNullable<OrgPulseSeriesQuery['organization']>['pulseSeries']>;
export type OrgPulseFactsData = NonNullable<NonNullable<PageOrgQuery['organization']>['pulse']>;
export type OrgPulseContributorRow = OrgPulseFactsData['topContributors'][number];
export type OrgPulseCountryRow = OrgPulseFactsData['countries'][number];
export type OrgPulseSharedOrgRow = OrgPulseFactsData['sharedContributorOrgs'][number];

export const GROUP_BY_OPTIONS: { value: OrgActivityGroupBy; label: string }[] = [
  { value: OrgActivityGroupBy.Type, label: 'Type' },
  { value: OrgActivityGroupBy.Language, label: 'Language' },
  { value: OrgActivityGroupBy.Kind, label: 'Kind' },
];

export const PERIOD_OPTIONS: { value: OrgPulsePeriod; label: string; long: string }[] = [
  { value: OrgPulsePeriod.Last_3Months, label: '3 months', long: 'last 3 months' },
  { value: OrgPulsePeriod.Last_12Months, label: '12 months', long: 'last 12 months' },
  { value: OrgPulsePeriod.Last_60Months, label: '60 months', long: 'last 60 months' },
];

export const SORT_OPTIONS: { value: OrgPulseContributorSort; label: string; long: string }[] = [
  { value: OrgPulseContributorSort.Lines, label: 'Lines', long: 'lines (added + deleted)' },
  { value: OrgPulseContributorSort.Commits, label: 'Commits', long: 'commits' },
  { value: OrgPulseContributorSort.PullRequests, label: 'PRs', long: 'pull requests' },
];

export const groupByLabel = (groupBy: OrgActivityGroupBy) =>
  GROUP_BY_OPTIONS.find((option) => option.value === groupBy)?.label ?? 'Type';

/** The API's name for the series that sums every label past its top ones. */
export const OTHER_SERIES_LABEL = 'Other';

/** The API's name for a kind or language it does not know. */
export const UNKNOWN_SERIES_LABEL = 'Other / unknown';

/**
 * The inflow tooltip names a month's largest single change when it holds at least this share of
 * the month's lines: below it, one change is not what the bar shows.
 */
export const LARGE_CHANGE_SHARE = 0.2;

/** The contributor table's page size; the API holds at most 100 rows a period and sort. */
export const CONTRIBUTORS_PAGE_SIZE = 25;

const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

/**
 * A series' colour, by its place in the API's order (largest first): both charts list the labels in
 * the same order, so a label keeps its colour across them. "Other" and "Other / unknown" each get
 * their own neutral.
 */
export function seriesColor(label: string, index: number): string {
  if (label === OTHER_SERIES_LABEL) {
    return 'var(--series-other)';
  }

  if (label === UNKNOWN_SERIES_LABEL) {
    return 'var(--series-unknown)';
  }

  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** The recharts keys of a label, so labels with spaces or dots never reach a data key. */
export const snapshotKey = (index: number) => `s${index}`;
export const addedKey = (index: number) => `a${index}`;
export const deletedKey = (index: number) => `d${index}`;

/** `[label][month]`, as the API sends the line matrices; a missing cell is 0. */
const cell = (matrix: number[][], label: number, month: number) => matrix[label]?.[month] ?? 0;

export type MonthRow = { index: number; month: string } & Record<string, number | string | null>;

/** One row per month with each label's month-end lines. */
export function toSnapshotRows(series: OrgPulseSeriesData): MonthRow[] {
  return series.months.map((month, m) => {
    const row: MonthRow = { index: m, month };
    series.labels.forEach((_, l) => {
      row[snapshotKey(l)] = cell(series.snapshot, l, m);
    });
    return row;
  });
}

/** One row per month: each label's lines added (positive, above the axis) and deleted (negative, below it). */
export function toInflowRows(series: OrgPulseSeriesData): MonthRow[] {
  return series.months.map((month, m) => {
    const row: MonthRow = { index: m, month };
    series.labels.forEach((_, l) => {
      row[addedKey(l)] = cell(series.added, l, m);
      // `0 - 0` would be -0, which recharts stacks above the axis.
      row[deletedKey(l)] = -cell(series.deleted, l, m) || 0;
    });
    return row;
  });
}

/** One row per month: active contributors (linked accounts, unlinked authors) and first-time ones (null before month 13). */
export function toContributorRows(
  series: OrgPulseSeriesData,
): { index: number; month: string; linked: number; anonymous: number; newContributors: number | null }[] {
  return series.months.map((month, m) => ({
    index: m,
    month,
    linked: series.activeLinked[m] ?? 0,
    anonymous: series.activeAnonymous[m] ?? 0,
    newContributors: series.newContributors[m] ?? null,
  }));
}

export type MonthLabelSnapshot = { label: string; index: number; lines: number };

/** A month's month-end lines per label, top band first (the API lists the largest first, stacked at the bottom). */
export function monthSnapshot(series: OrgPulseSeriesData, m: number): { labels: MonthLabelSnapshot[]; total: number } {
  const labels = series.labels.map((label, l) => ({ label, index: l, lines: cell(series.snapshot, l, m) })).reverse();
  return { labels, total: labels.reduce((sum, { lines }) => sum + lines, 0) };
}

export type MonthLabelInflow = { label: string; index: number; added: number; deleted: number; net: number };

export type MonthInflow = {
  labels: MonthLabelInflow[];
  added: number;
  deleted: number;
  net: number;
  /** The month's largest single change, only when it holds at least `LARGE_CHANGE_SHARE` of the month's lines. */
  largest: { lines: number; share: number } | null;
  /** Lines of files crossing 100 KB in the month. */
  crossLines: number;
  commits: number;
  pullRequests: number;
};

/** What the inflow tooltip lists for a month: per label (top band first) and the month's totals. */
export function monthInflow(series: OrgPulseSeriesData, m: number): MonthInflow {
  const labels = series.labels
    .map((label, l) => {
      const added = cell(series.added, l, m);
      const deleted = cell(series.deleted, l, m);
      return { label, index: l, added, deleted, net: added - deleted };
    })
    .reverse();
  const added = labels.reduce((sum, label) => sum + label.added, 0);
  const deleted = labels.reduce((sum, label) => sum + label.deleted, 0);
  const lines = series.largestChange[m] ?? 0;
  const share = series.largestChangeShare[m] ?? 0;

  return {
    labels,
    added,
    deleted,
    net: added - deleted,
    largest: lines > 0 && share >= LARGE_CHANGE_SHARE ? { lines, share } : null,
    crossLines: series.crossLines[m] ?? 0,
    commits: series.commits[m] ?? 0,
    pullRequests: series.pullRequests[m] ?? 0,
  };
}

/** Whether the series has any line to draw: an org can have months but no counted lines in one grouping. */
export function hasLines(series: OrgPulseSeriesData | null | undefined): series is OrgPulseSeriesData {
  if (!series?.months.length) {
    return false;
  }

  const any = (matrix: number[][]) => matrix.some((row) => row.some((value) => value !== 0));
  return any(series.snapshot) || any(series.added) || any(series.deleted);
}

/** Tick months on the axis: every January, or every quarter for a window under two years. */
export function monthTicks(months: string[]): string[] {
  if (months.length <= 1) {
    return months;
  }

  const step = months.length < 24 ? 3 : 12;
  const ticks = months.filter((month) => (Number(month.slice(5, 7)) - 1) % step === 0);

  return ticks.length ? ticks : [months[0]];
}

const SHORT_MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const SHORT_MONTH_2 = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

/** `2024-03` → `Mar 2024`. */
export function formatMonth(month: string): string {
  const date = monthDate(month);
  return Number.isNaN(date.getTime()) ? month : SHORT_MONTH.format(date);
}

/** An axis tick: the year alone on yearly ticks, `Mar 24` on quarterly ones. */
export function formatMonthTick(month: string, monthsCount: number): string {
  const date = monthDate(month);

  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return monthsCount < 24 ? SHORT_MONTH_2.format(date) : String(date.getUTCFullYear());
}

const UTC_DAY = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/** A timestamp's UTC day, `Oct 18, 2026`: never shifted by the viewer's time zone. */
export function formatUtcDay(value: unknown): string | null {
  const date = typeof value === 'string' || typeof value === 'number' || value instanceof Date ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? UTC_DAY.format(date) : null;
}

const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** A count in full: `1,234,567`. */
export const formatCount = (value: number) => INTEGER.format(Math.round(value));

/** A count on an axis: `1.2M`. A negative value (deleted lines, below the axis) shows its size. */
export const formatAxisCount = (value: number) => COMPACT.format(Math.abs(value));

/** A net change with its sign: `+1,234`, `−56`, `0`. */
export function formatSigned(value: number): string {
  const rounded = Math.round(value);

  if (rounded === 0) {
    return '0';
  }

  return `${rounded > 0 ? '+' : '−'}${INTEGER.format(Math.abs(rounded))}`;
}

/** A 0–1 share as a percentage with one decimal; a non-zero share under 0.05% shows as `<0.1%`. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.0005) {
    return '<0.1%';
  }

  return `${(share * 100).toFixed(1)}%`;
}

/** `1 contributor`, `2 contributors`. */
export const plural = (count: number, one: string, many = `${one}s`) =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/**
 * A GitHub avatar at `size` px (twice that for high-density screens). The API's fallback avatar URL
 * has no query, so the size goes in as the first parameter there.
 */
export function avatarSrc(url: string, size: number): string {
  if (!url) {
    return url;
  }

  return `${url}${url.includes('?') ? '&' : '?'}s=${size * 2}`;
}

/** A countries row's name: the country, or what the group counts. */
export function countryRowLabel(row: Pick<OrgPulseCountryRow, 'group' | 'country'>): string {
  switch (row.group) {
    case OrgPulseCountryGroup.NoLocation:
      return 'No location on gitranks';
    case OrgPulseCountryGroup.NotOnGitranks:
      return 'Not on gitranks';
    default:
      return row.country || 'Unknown';
  }
}
