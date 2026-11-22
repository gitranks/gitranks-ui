import type { PackageDownloads, PackageDownloadsPoint } from '@/graphql/package-page';
import type { DownloadsUnit } from '@/lib/packages/registries';

const DAY = 86_400_000;

/** How far a week a year before may sit from the week it is set against, in days: weeks start on Mondays. */
const YEAR_AGO_SLACK_DAYS = 3;

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const MONTH_YEAR_LONG = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** "October 2026": the month a history point or a day is in. */
export const formatMonth = (value: string) => MONTH_YEAR_LONG.format(new Date(value));

/** A change in whole percent, `null` without a base to set it against. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || !(previous > 0)) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

const sumOf = (points: readonly PackageDownloadsPoint[]) => points.reduce((sum, { downloads }) => sum + downloads, 0);

/**
 * Year over year, as the page and the badges say it, in whole percent: the last 52 whole weeks against the 52 before;
 * on a registry counted a month at a time, the last 12 whole months against the 12 before. `null` until the history
 * reaches back that far.
 */
export function yearOverYearChange(
  downloads: Pick<PackageDownloads, 'last52Weeks' | 'previous52Weeks' | 'months'>,
  unit: DownloadsUnit = 'week',
): number | null {
  if (unit === 'week') return percentChange(downloads.last52Weeks, downloads.previous52Weeks);
  const months = downloads.months ?? [];
  return months.length >= 24 ? percentChange(sumOf(months.slice(-12)), sumOf(months.slice(-24, -12))) : null;
}

/**
 * Last week's downloads per GitHub star of the repository that publishes the package, as the page and the badges say
 * it; `null` without a repository with stars.
 */
export function downloadsPerStar(
  downloads: Pick<PackageDownloads, 'perStar'> | null | undefined,
  repo: { stars: number } | null | undefined,
): number | null {
  const perStar = downloads?.perStar;
  return perStar !== null && perStar !== undefined && Number.isFinite(perStar) && repo && repo.stars > 0
    ? perStar
    : null;
}

/** "↑16%", "↓3%", "0%". */
export const changeText = (change: number) => (change > 0 ? `↑${change}%` : change < 0 ? `↓${-change}%` : '0%');

const timeOf = (value: string) => new Date(value).getTime();

/** One change of a period against an earlier one: its percent and what it is against ("vs Sep"). */
export type DownloadsChange = { change: number; against: string };

/** What the Downloads card shows for one period: its total, its label, its changes and its line. */
export type DownloadsPeriod = {
  total: number;
  /** "in the week to Nov 16", "in October". */
  label: string;
  changes: DownloadsChange[];
  /** The line under it, oldest first. */
  series: PackageDownloadsPoint[];
};

/** The weekly point of a year before the week that starts at `start`, give or take a few days; `null` without one. */
function yearAgoWeek(weeks: readonly PackageDownloadsPoint[], start: number): PackageDownloadsPoint | null {
  const target = start - 364 * DAY;
  return weeks.find((point) => Math.abs(timeOf(point.start) - target) <= YEAR_AGO_SLACK_DAYS * DAY) ?? null;
}

/**
 * The Week view: the 7 days to `through`, against the 7 before and against the same week a year before (from the
 * weekly history). A change whose base the history does not reach is left out.
 */
export function weekPeriodOf(downloads: PackageDownloads): DownloadsPeriod {
  const weeks = downloads.weeks ?? [];
  const through = timeOf(downloads.through);
  const yearAgo = Number.isNaN(through) ? null : yearAgoWeek(weeks, through - 6 * DAY);
  const changes: DownloadsChange[] = [];
  const lastWeek = downloads.lastWeek ?? 0;
  const weekBefore = percentChange(lastWeek, downloads.previousWeek);
  if (weekBefore !== null) changes.push({ change: weekBefore, against: 'vs the week before' });
  const yearBefore = yearAgo ? percentChange(lastWeek, yearAgo.downloads) : null;
  if (yearBefore !== null) changes.push({ change: yearBefore, against: 'vs a year before' });

  return {
    total: lastWeek,
    label: Number.isNaN(through) ? 'last week' : `in the week to ${DAY_SHORT.format(through)}`,
    changes,
    series: weeks.slice(-52),
  };
}

/** The point of the month `back` months before the month that starts at `start`; `null` without one. */
function monthBefore(months: readonly PackageDownloadsPoint[], start: Date, back: number) {
  const target = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - back, 1);
  return months.find((point) => timeOf(point.start) === target) ?? null;
}

/**
 * The Month view: the last whole calendar month, against the month before and the same month a year before. `null`
 * without a whole month yet; a change whose month the history does not reach is left out.
 */
export function monthPeriodOf(downloads: PackageDownloads): DownloadsPeriod | null {
  const months = downloads.months ?? [];
  const last = months.at(-1);
  if (!last) {
    return null;
  }

  const start = new Date(last.start);
  const changes: DownloadsChange[] = [];
  const before = monthBefore(months, start, 1);
  const beforeChange = before ? percentChange(last.downloads, before.downloads) : null;
  if (before && beforeChange !== null) {
    changes.push({ change: beforeChange, against: `vs ${MONTH_SHORT.format(new Date(before.start))}` });
  }
  const yearAgo = monthBefore(months, start, 12);
  const yearChange = yearAgo ? percentChange(last.downloads, yearAgo.downloads) : null;
  if (yearAgo && yearChange !== null) {
    changes.push({ change: yearChange, against: `vs ${MONTH_YEAR.format(new Date(yearAgo.start))}` });
  }

  return { total: last.downloads, label: `in ${MONTH.format(start)}`, changes, series: months.slice(-12) };
}

/**
 * The month just ended on a registry counted a month at a time: its whole-month view when the history has the month,
 * else the month and the one before as the counts give them (`last30Days`, `previous30Days`).
 */
export function lastMonthPeriodOf(downloads: PackageDownloads): DownloadsPeriod {
  const month = monthPeriodOf(downloads);
  if (month) return month;
  const change = percentChange(downloads.last30Days, downloads.previous30Days);
  return {
    total: downloads.last30Days,
    label: 'last month',
    changes: change === null ? [] : [{ change, against: 'vs the month before' }],
    series: [],
  };
}

/** What the Downloads history shows: its points, their total, and what the total covers. */
export type DownloadsHistory = {
  /** Oldest first: the last 52 weeks, or the last 12 months on a registry counted a month at a time. */
  points: PackageDownloadsPoint[];
  total: number;
  /** "in the last 12 months", "since October 2026", "in October 2026". */
  totalLabel: string;
  /** "Nov 17, 2025 – Nov 16, 2026", "Oct 2025 – Sep 2026"; `null` without a point. */
  range: string | null;
};

/**
 * A package's downloads over the last year in its registry's unit: weekly, the last 52 weeks and their total; monthly,
 * the last 12 months, or the months read so far when the history is shorter (it starts at the first month read).
 */
export function downloadsHistoryOf(unit: DownloadsUnit, downloads: PackageDownloads): DownloadsHistory {
  if (unit === 'week') {
    return {
      points: (downloads.weeks ?? []).slice(-52),
      total: downloads.last52Weeks,
      totalLabel: 'in the last 12 months',
      range: weeksRangeText(downloads),
    };
  }
  const points = (downloads.months ?? []).slice(-12);
  const first = points[0];
  const last = points.at(-1);
  const totalLabel =
    points.length >= 12 || !first
      ? 'in the last 12 months'
      : points.length === 1
        ? `in ${formatMonth(first.start)}`
        : `since ${formatMonth(first.start)}`;
  const range =
    first && last
      ? points.length === 1
        ? MONTH_YEAR.format(new Date(first.start))
        : `${MONTH_YEAR.format(new Date(first.start))} – ${MONTH_YEAR.format(new Date(last.start))}`
      : null;
  return { points, total: sumOf(points), totalLabel, range };
}

/**
 * A package's downloads over the last 12 months: the last 52 weeks on a registry counted by the week; on one counted
 * a month at a time, the last 12 whole months, `null` until the history holds 12 of them.
 */
export function yearOfDownloads(
  unit: DownloadsUnit,
  downloads: Pick<PackageDownloads, 'last52Weeks' | 'months'>,
): number | null {
  if (unit === 'week') return downloads.last52Weeks;
  const months = downloads.months ?? [];
  return months.length >= 12 ? sumOf(months.slice(-12)) : null;
}

/** "Nov 17, 2025 – Nov 16, 2026": the days a 52-week line covers, from its first Monday to `through`. */
export function weeksRangeText(downloads: Pick<PackageDownloads, 'through' | 'weeks'>, count = 52): string | null {
  const shown = (downloads.weeks ?? []).slice(-count);
  const first = shown[0];
  const through = timeOf(downloads.through);
  if (!first || Number.isNaN(through)) {
    return null;
  }
  const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
  return `${day.format(new Date(first.start))} – ${day.format(through)}`;
}
