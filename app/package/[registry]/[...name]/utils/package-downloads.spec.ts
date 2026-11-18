import { describe, expect, it } from 'vitest';

import { months, rankedPackage, weeks } from '../__fixtures__/package';
import { changeText, monthPeriodOf, percentChange, weekPeriodOf, weeksRangeText } from './package-downloads';

const downloads = rankedPackage.downloads!;

describe('the downloads helper', () => {
  it('words a change in whole percent, with nothing to set it against when the base is missing or zero', () => {
    expect(percentChange(97, 100)).toBe(-3);
    expect(percentChange(116, 100)).toBe(16);
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(5, null)).toBeNull();
    expect([changeText(16), changeText(-3), changeText(0)]).toEqual(['↑16%', '↓3%', '0%']);
  });

  it('sets the week against the week before and the same week a year before', () => {
    const period = weekPeriodOf(downloads);

    expect(period.total).toBe(1_797_999);
    expect(period.label).toBe('in the week to Nov 16');
    // A year before the week of Nov 9, 2026 is the week of Nov 10, 2025: 52 points earlier, 151,000.
    expect(period.changes).toEqual([
      { change: 6, against: 'vs the week before' },
      { change: Math.round(((1_797_999 - 151_000) / 151_000) * 100), against: 'vs a year before' },
    ]);
    expect(period.series).toHaveLength(52);
  });

  it('sets the last whole month against the month before and the same month a year before', () => {
    const period = monthPeriodOf(downloads);

    expect(period?.total).toBe(7_400_000);
    expect(period?.label).toBe('in October');
    expect(period?.changes).toEqual([
      { change: 1, against: 'vs Sep' },
      { change: Math.round((1_200_000 / 6_200_000) * 100), against: 'vs Oct 2025' },
    ]);
  });

  it('leaves out what a young package’s history does not reach', () => {
    const young = { ...downloads, previousWeek: 0, weeks: weeks.slice(-4), months: months.slice(-2) };

    expect(weekPeriodOf(young).changes).toEqual([]);
    expect(monthPeriodOf(young)?.changes).toEqual([{ change: 1, against: 'vs Sep' }]);
    expect(monthPeriodOf({ ...young, months: [] })).toBeNull();
  });

  it('says the days the 52-week line covers', () => {
    expect(weeksRangeText(downloads)).toBe('Nov 17, 2025 – Nov 16, 2026');
    expect(weeksRangeText({ ...downloads, weeks: [] })).toBeNull();
  });
});
