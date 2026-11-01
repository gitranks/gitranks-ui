import type { PageRepoQuery } from '@/types/generated/graphql';

export type RepoHistory = NonNullable<NonNullable<PageRepoQuery['repo']>['history']>;

export type StarHistoryPoint = { time: number; stars: number; current?: true };

/** A shaded month on the chart, as times. */
export type BurstRange = { x1: number; x2: number };

const MONTH = /^(\d{4})-(\d{2})/;

const DATE_FORMATTER = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

const timeOf = (date: unknown) => (typeof date === 'string' || date instanceof Date ? new Date(date).getTime() : NaN);

/**
 * The chart's points, oldest first: the stars at each point of the history, then the current count. The current
 * count replaces a point at the same time or later, so the line never goes back in time.
 */
export function getStarHistoryPoints(history: RepoHistory | null | undefined): StarHistoryPoint[] {
  if (!history) {
    return [];
  }

  const points: StarHistoryPoint[] = history.points
    .map(({ date, stars }) => ({ time: timeOf(date), stars }))
    .filter(({ time }) => Number.isFinite(time))
    .sort((a, b) => a.time - b.time);

  const currentTime = timeOf(history.current.date);
  if (!Number.isFinite(currentTime)) {
    return points;
  }

  return [
    ...points.filter(({ time }) => time < currentTime),
    { time: currentTime, stars: history.current.stars, current: true },
  ];
}

/** The burst months ('YYYY-MM…') as ranges from the month's start to the next month's, kept inside `[min, max]`. */
export function getBurstRanges(burstMonths: string[] | null | undefined, min: number, max: number): BurstRange[] {
  const seen = new Set<number>();

  return (burstMonths ?? []).flatMap((month) => {
    const match = MONTH.exec(month);
    if (!match) {
      return [];
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const start = Date.UTC(year, monthIndex, 1);
    if (seen.has(start)) {
      return [];
    }
    seen.add(start);

    const x1 = Math.max(start, min);
    const x2 = Math.min(Date.UTC(year, monthIndex + 1, 1), max);

    return x1 < x2 ? [{ x1, x2 }] : [];
  });
}

/**
 * The line under the chart, in parts: the current count and its date (the caption strikes GitHub's count through
 * before it when some stars don't count), then the notes on shading and estimates.
 */
export function getStarHistoryNoteParts(
  history: RepoHistory,
  burstMonths: string[] | null | undefined,
): { current: { stars: number; date: string } | null; notes: string[] } {
  const points = getStarHistoryPoints(history);
  const currentTime = timeOf(history.current.date);
  const shaded =
    points.length >= 2 && getBurstRanges(burstMonths, points[0].time, points[points.length - 1].time).length > 0;

  return {
    current: Number.isFinite(currentTime)
      ? { stars: history.current.stars, date: DATE_FORMATTER.format(currentTime) }
      : null,
    notes: [
      shaded && 'Shaded months gained stars much faster than the months before them.',
      !history.complete && 'The earliest months are estimates.',
    ].filter((note): note is string => !!note),
  };
}
