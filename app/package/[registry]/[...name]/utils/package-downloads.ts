import type { PackageDownloads, PackageDownloadsPoint } from '@/graphql/package-page';

const DAY = 86_400_000;

/** How far a week a year before may sit from the week it is set against, in days: weeks start on Mondays. */
const YEAR_AGO_SLACK_DAYS = 3;

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
const MONTH_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const MONTH_YEAR = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DAY_SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** A change in whole percent, `null` without a base to set it against. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || !(previous > 0)) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Year over year, as the page and the badges say it: the last 52 whole weeks against the 52 before, in whole percent;
 * `null` until the history reaches back that far.
 */
export const yearOverYearChange = (downloads: Pick<PackageDownloads, 'last52Weeks' | 'previous52Weeks'>) =>
  percentChange(downloads.last52Weeks, downloads.previous52Weeks);

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
  const weekBefore = percentChange(downloads.lastWeek, downloads.previousWeek);
  if (weekBefore !== null) changes.push({ change: weekBefore, against: 'vs the week before' });
  const yearBefore = yearAgo ? percentChange(downloads.lastWeek, yearAgo.downloads) : null;
  if (yearBefore !== null) changes.push({ change: yearBefore, against: 'vs a year before' });

  return {
    total: downloads.lastWeek,
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
