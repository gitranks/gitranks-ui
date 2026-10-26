import { describe, expect, it } from 'vitest';

import { getBurstRanges, getStarHistoryNote, getStarHistoryPoints, type RepoHistory } from './star-history';

const history = (points: RepoHistory['points'], current: RepoHistory['current']): RepoHistory => ({
  points,
  current,
  complete: true,
  readAt: '2026-10-20T00:00:00.000Z',
});

describe('getStarHistoryPoints', () => {
  it('is empty without a history', () => {
    expect(getStarHistoryPoints(null)).toEqual([]);
    expect(getStarHistoryPoints(undefined)).toEqual([]);
  });

  it('sorts the points by date and ends with the current count, marked', () => {
    const points = getStarHistoryPoints(
      history(
        [
          { date: '2026-09-01T00:00:00.000Z', stars: 120 },
          { date: '2026-07-14T00:00:00.000Z', stars: 0 },
          { date: '2026-08-01T00:00:00.000Z', stars: 40 },
        ],
        { date: '2026-10-20T00:00:00.000Z', stars: 150 },
      ),
    );

    expect(points).toEqual([
      { time: Date.UTC(2026, 6, 14), stars: 0 },
      { time: Date.UTC(2026, 7, 1), stars: 40 },
      { time: Date.UTC(2026, 8, 1), stars: 120 },
      { time: Date.UTC(2026, 9, 20), stars: 150, current: true },
    ]);
  });

  it('lets the current count replace points at its date or after it', () => {
    const points = getStarHistoryPoints(
      history(
        [
          { date: '2026-09-01T00:00:00.000Z', stars: 10 },
          { date: '2026-10-01T00:00:00.000Z', stars: 30 },
          { date: '2026-11-01T00:00:00.000Z', stars: 35 },
        ],
        { date: '2026-10-01T00:00:00.000Z', stars: 32 },
      ),
    );

    expect(points).toEqual([
      { time: Date.UTC(2026, 8, 1), stars: 10 },
      { time: Date.UTC(2026, 9, 1), stars: 32, current: true },
    ]);
  });

  it('drops points whose date cannot be read', () => {
    const points = getStarHistoryPoints(
      history(
        [
          { date: 'not a date', stars: 5 },
          { date: '2026-09-01T00:00:00.000Z', stars: 10 },
        ],
        { date: null, stars: 12 },
      ),
    );

    expect(points).toEqual([{ time: Date.UTC(2026, 8, 1), stars: 10 }]);
  });
});

describe('getBurstRanges', () => {
  const min = Date.UTC(2026, 0, 15);
  const max = Date.UTC(2026, 9, 20);

  it('spans each burst month from its start to the next month', () => {
    expect(getBurstRanges(['2026-03-01', '2026-12'], Date.UTC(2026, 0, 1), Date.UTC(2027, 0, 1))).toEqual([
      { x1: Date.UTC(2026, 2, 1), x2: Date.UTC(2026, 3, 1) },
      { x1: Date.UTC(2026, 11, 1), x2: Date.UTC(2027, 0, 1) },
    ]);
  });

  it('keeps the ranges inside the chart', () => {
    expect(getBurstRanges(['2026-01-01', '2026-10-01'], min, max)).toEqual([
      { x1: min, x2: Date.UTC(2026, 1, 1) },
      { x1: Date.UTC(2026, 9, 1), x2: max },
    ]);
  });

  it('skips months outside the chart and values that are not months', () => {
    expect(getBurstRanges(['2025-06-01', '2027-01-01', 'soon', ''], min, max)).toEqual([]);
    expect(getBurstRanges(null, min, max)).toEqual([]);
  });

  it('keeps one range per month when a month is listed twice', () => {
    expect(getBurstRanges(['2026-03', '2026-03-01'], min, max)).toEqual([
      { x1: Date.UTC(2026, 2, 1), x2: Date.UTC(2026, 3, 1) },
    ]);
  });
});

describe('getStarHistoryNote', () => {
  const points = [
    { date: '2026-01-01T00:00:00.000Z', stars: 10 },
    { date: '2026-05-01T00:00:00.000Z', stars: 900 },
  ];
  const current = { date: '2026-10-20T00:00:00.000Z', stars: 1234 };

  it('names the current count and date, the shading and the estimates', () => {
    expect(getStarHistoryNote({ ...history(points, current), complete: false }, ['2026-03'])).toBe(
      '1,234 stars on Oct 20, 2026. Shaded months gained stars much faster than the months before them. The earliest months are estimates.',
    );
  });

  it('leaves out the shading note when no burst month is on the chart', () => {
    expect(getStarHistoryNote(history(points, current), ['2020-03', '2027-01'])).toBe('1,234 stars on Oct 20, 2026.');
  });

  it('leaves out the count sentence when its date cannot be read', () => {
    expect(getStarHistoryNote({ ...history(points, { date: 'garbage', stars: 5 }), complete: false }, null)).toBe(
      'The earliest months are estimates.',
    );
  });
});
