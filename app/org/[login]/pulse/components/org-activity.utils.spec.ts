import { describe, expect, it } from 'vitest';

import {
  formatMonth,
  formatMonthTick,
  formatShare,
  formatUtcDay,
  isolatedMonths,
  lowVolumeRanges,
  monthDomain,
  monthHasData,
  monthTicks,
  type OrgActivityData,
  seriesColor,
  seriesTopFirst,
  stackedSegments,
  toChartRows,
} from './org-activity.utils';

const chart: OrgActivityData = {
  months: ['2024-11', '2024-12', '2025-01'],
  series: [
    { label: 'TypeScript', shares: [0.6, 0, 0.5] },
    { label: 'Tests · TS', shares: [0.3, 0, 0.25] },
    { label: 'Other', shares: [0.1, 0, 0.25] },
  ],
  commits: [40, 0, 120],
  lowVolume: [false, true, false],
  otherUnknownShare: 0.02,
  computedAt: '2026-10-18T02:00:00.000Z',
  scopeNote: '3 public repositories with 5+ stars, pushed in the last 5 years',
};

describe('toChartRows', () => {
  it('makes one row per month with each series under its own key, and gaps for months with no data', () => {
    expect(toChartRows(chart)).toEqual([
      { index: 0, month: '2024-11', commits: 40, lowVolume: false, s0: 0.6, s1: 0.3, s2: 0.1 },
      { index: 1, month: '2024-12', commits: 0, lowVolume: true, s0: null, s1: null, s2: null },
      { index: 2, month: '2025-01', commits: 120, lowVolume: false, s0: 0.5, s1: 0.25, s2: 0.25 },
    ]);
  });
});

describe('monthHasData', () => {
  it('is false for a month where every share is 0', () => {
    expect(monthHasData(chart, 0)).toBe(true);
    expect(monthHasData(chart, 1)).toBe(false);
  });
});

describe('lowVolumeRanges', () => {
  it('shades each run of low-volume months half a step either side, clipped to the plot', () => {
    expect(lowVolumeRanges([true, true, false, false, true, false, true])).toEqual([
      { x1: 0, x2: 1.5 },
      { x1: 3.5, x2: 4.5 },
      { x1: 5.5, x2: 6 },
    ]);
  });

  it('shades nothing when no month is low volume, and the whole plot when all are', () => {
    expect(lowVolumeRanges([false, false])).toEqual([]);
    expect(lowVolumeRanges([true, true, true])).toEqual([{ x1: 0, x2: 2 }]);
  });

  it('shades a single-month window across its half-step domain', () => {
    expect(lowVolumeRanges([true])).toEqual([{ x1: -0.5, x2: 0.5 }]);
    expect(lowVolumeRanges([false])).toEqual([]);
  });
});

const withShares = (shares: number[][]): OrgActivityData => ({
  ...chart,
  months: shares[0].map((_, i) => `2025-${String(i + 1).padStart(2, '0')}`),
  series: shares.map((s, i) => ({ label: `L${i}`, shares: s })),
});

describe('isolatedMonths', () => {
  it('finds months with data whose neighbours have none, including at the edges', () => {
    // 0 and 7 have the window's edge on one side and an empty month on the other; 2 sits between two empty months
    expect(isolatedMonths(withShares([[1, 0, 0.5, 0, 1, 1, 0, 1]]))).toEqual([0, 2, 7]);
  });

  it('treats a one-month window as isolated', () => {
    expect(isolatedMonths(withShares([[1]]))).toEqual([0]);
  });

  it('finds none when every month has a neighbour with data', () => {
    expect(isolatedMonths(withShares([[1, 1, 0.5]]))).toEqual([]);
    expect(isolatedMonths(withShares([[1, 1, 0, 1, 1]]))).toEqual([]);
  });
});

describe('stackedSegments', () => {
  it("stacks a month's bands bottom first and leaves out empty ones", () => {
    expect(
      stackedSegments(
        withShares([
          [0.5, 0],
          [0, 0],
          [0.25, 0],
          [0.25, 0],
        ]),
        0,
      ),
    ).toEqual([
      { index: 0, y1: 0, y2: 0.5 },
      { index: 2, y1: 0.5, y2: 0.75 },
      { index: 3, y1: 0.75, y2: 1 },
    ]);
  });
});

describe('monthDomain', () => {
  it('gives a single month half a step either side', () => {
    expect(monthDomain(1)).toEqual([-0.5, 0.5]);
    expect(monthDomain(60)).toEqual([0, 59]);
  });
});

describe('seriesTopFirst', () => {
  it('lists the top band first, keeping each series index', () => {
    expect(seriesTopFirst(chart).map(({ series, index }) => [series.label, index])).toEqual([
      ['Other', 2],
      ['Tests · TS', 1],
      ['TypeScript', 0],
    ]);
  });
});

describe('monthTicks', () => {
  it('ticks every January on a long window', () => {
    const months = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.UTC(2023, 9 + i, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    });

    expect(monthTicks(months).map((i) => months[i])).toEqual(['2024-01', '2025-01', '2026-01']);
  });

  it('ticks every quarter on a window under two years', () => {
    expect(monthTicks(['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07'])).toEqual([2, 5]);
  });
});

describe('formatting', () => {
  it('formats months, ticks and shares', () => {
    expect(formatMonth('2024-03')).toBe('Mar 2024');
    expect(formatMonthTick('2024-01', 60)).toBe('2024');
    expect(formatMonthTick('2024-04', 12)).toBe('Apr 24');
    expect(formatShare(0.2345)).toBe('23.4%');
    expect(formatShare(0)).toBe('0.0%');
    expect(formatShare(0.0001)).toBe('<0.1%');
    expect(formatShare(1)).toBe('100.0%');
  });

  it('formats the update day in UTC, whatever the time zone', () => {
    expect(formatUtcDay('2026-10-18T02:00:00.000Z')).toBe('Oct 18, 2026');
    expect(formatUtcDay('2026-10-18T23:30:00.000Z')).toBe('Oct 18, 2026');
    expect(formatUtcDay('not a date')).toBeNull();
    expect(formatUtcDay(null)).toBeNull();
  });
});

describe('seriesColor', () => {
  it('colours by position and gives "Other" and "Other / unknown" their own greys', () => {
    expect(seriesColor('TypeScript', 0)).toBe('var(--series-1)');
    expect(seriesColor('Docs', 7)).toBe('var(--series-8)');
    expect(seriesColor('Other', 8)).toBe('var(--series-other)');
    expect(seriesColor('Other / unknown', 3)).toBe('var(--series-unknown)');
  });
});
