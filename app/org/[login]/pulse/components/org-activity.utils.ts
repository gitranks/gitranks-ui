import { type OrgActivityChart, OrgActivityGroupBy } from '@/types/generated/graphql';

export type OrgActivityData = Pick<
  OrgActivityChart,
  'months' | 'commits' | 'lowVolume' | 'otherUnknownShare' | 'computedAt' | 'scopeNote'
> & { series: { label: string; shares: number[] }[] };

export const GROUP_BY_OPTIONS: { value: OrgActivityGroupBy; label: string }[] = [
  { value: OrgActivityGroupBy.Type, label: 'Type' },
  { value: OrgActivityGroupBy.Language, label: 'Language' },
  { value: OrgActivityGroupBy.Kind, label: 'Kind' },
];

/** The API's name for the series that sums every label past its top ones. */
export const OTHER_SERIES_LABEL = 'Other';

/** The API flags a month as low volume below this many commits. */
export const LOW_VOLUME_COMMITS = 30;

const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

/** A series' colour: by its place in the API's order (heaviest first), with "Other" always grey. */
export function seriesColor(label: string, index: number): string {
  if (label === OTHER_SERIES_LABEL) {
    return 'var(--series-other)';
  }

  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/** The recharts key of a series, so labels with spaces or dots never reach a data key. */
export const seriesKey = (index: number) => `s${index}`;

export type ChartRow = { index: number; month: string; commits: number; lowVolume: boolean } & Record<
  string,
  number | string | boolean | null
>;

/**
 * One row per month, each series under its own key. A month with no counted change gets `null`
 * shares, so the chart leaves a gap there instead of dropping every band to 0%.
 */
export function toChartRows(chart: OrgActivityData): ChartRow[] {
  return chart.months.map((month, i) => {
    const row: ChartRow = { index: i, month, commits: chart.commits[i] ?? 0, lowVolume: !!chart.lowVolume[i] };
    const hasData = monthHasData(chart, i);
    chart.series.forEach((series, s) => {
      row[seriesKey(s)] = hasData ? (series.shares[i] ?? 0) : null;
    });
    return row;
  });
}

/** Whether a month has any counted change: a month with none has every share at 0. */
export function monthHasData(chart: OrgActivityData, index: number): boolean {
  return chart.series.some((series) => (series.shares[index] ?? 0) > 0);
}

/**
 * The x ranges to shade for low-volume months, one per run of consecutive ones. A month spans half
 * a step either side of its point, clipped to the plot.
 */
export function lowVolumeRanges(lowVolume: boolean[]): { x1: number; x2: number }[] {
  const last = lowVolume.length - 1;
  const ranges: { x1: number; x2: number }[] = [];
  let start = -1;

  for (let i = 0; i <= lowVolume.length; i++) {
    if (i <= last && lowVolume[i]) {
      if (start < 0) {
        start = i;
      }
    } else if (start >= 0) {
      ranges.push({ x1: Math.max(0, start - 0.5), x2: Math.min(last, i - 1 + 0.5) });
      start = -1;
    }
  }

  return ranges.filter(({ x1, x2 }) => x2 > x1);
}

/** Tick positions on the month axis: every January, or every quarter for a window under two years. */
export function monthTicks(months: string[]): number[] {
  if (months.length <= 1) {
    return months.map((_, i) => i);
  }

  const step = months.length < 24 ? 3 : 12;
  const ticks = months.flatMap((month, i) => ((monthNumber(month) - 1) % step === 0 ? [i] : []));

  return ticks.length ? ticks : [0];
}

const monthNumber = (month: string) => Number(month.slice(5, 7));

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

/** A 0–1 share as a percentage with one decimal; a non-zero share under 0.05% shows as `<0.1%`. */
export function formatShare(share: number): string {
  if (share > 0 && share < 0.0005) {
    return '<0.1%';
  }

  return `${(share * 100).toFixed(1)}%`;
}
