import type { PageRepoQuery } from '@/types/generated/graphql';

export type RepoHistory = NonNullable<NonNullable<PageRepoQuery['repo']>['history']>;

export type StarHistoryPoint = { time: number; stars: number; current?: true };

/** A shaded month on the chart, as times. */
export type BurstRange = { x1: number; x2: number };

const MONTH = /^(\d{4})-(\d{2})/;

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
  return (burstMonths ?? []).flatMap((month) => {
    const match = MONTH.exec(month);
    if (!match) {
      return [];
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const x1 = Math.max(Date.UTC(year, monthIndex, 1), min);
    const x2 = Math.min(Date.UTC(year, monthIndex + 1, 1), max);

    return x1 < x2 ? [{ x1, x2 }] : [];
  });
}
