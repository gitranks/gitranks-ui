import { describe, expect, it } from 'vitest';

import { buildStarHistoryChart, STAR_HISTORY_PLOT, type StarPoint } from './star-history-chart';

const { left, right, top, bottom } = STAR_HISTORY_PLOT;

const coordsOf = (path: string) =>
  [...path.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(([, x, y]) => ({ x: Number(x), y: Number(y) }));

describe('buildStarHistoryChart', () => {
  const points: StarPoint[] = [
    { date: '2020-03-10T00:00:00Z', stars: 0 },
    { date: '2020-04-01T00:00:00Z', stars: 40 },
    { date: '2021-01-01T00:00:00Z', stars: 600 },
    { date: '2022-01-01T00:00:00Z', stars: 900 },
  ];
  const current = { date: '2022-06-01T00:00:00Z', stars: 1200 };

  it('spans the plot from the first point to today, the most stars at the top', () => {
    const { line, end } = buildStarHistoryChart(points, current);
    const coords = coordsOf(line);

    expect(coords).toHaveLength(5);
    expect(coords[0]).toEqual({ x: left, y: bottom });
    expect(end).toEqual({ x: right, y: top });
    for (const { x, y } of coords) {
      expect(x).toBeGreaterThanOrEqual(left);
      expect(x).toBeLessThanOrEqual(right);
      expect(y).toBeGreaterThanOrEqual(top);
      expect(y).toBeLessThanOrEqual(bottom);
    }
  });

  it('closes the area down to the bottom of the plot', () => {
    const { line, area } = buildStarHistoryChart(points, current);

    expect(area).toBe(`${line} L${right} ${bottom} L${left} ${bottom} Z`);
  });

  it('sorts the points and ends with today, whatever comes after it', () => {
    const shuffled = [points[2], points[0], { date: '2023-01-01T00:00:00Z', stars: 5000 }, points[3], points[1]];

    expect(buildStarHistoryChart(shuffled, current)).toEqual(buildStarHistoryChart(points, current));
  });

  it('draws a single point flat across the plot', () => {
    const { line, end, ticks } = buildStarHistoryChart([], { date: '2026-10-20T00:00:00Z', stars: 12 });

    expect(line).toBe(`M${left} ${top} L${right} ${top}`);
    expect(end).toEqual({ x: right, y: top });
    expect(ticks).toEqual([]);
  });

  it('keeps a series without stars on the bottom line', () => {
    const { line } = buildStarHistoryChart([{ date: '2025-01-01T00:00:00Z', stars: 0 }], {
      date: '2025-06-01T00:00:00Z',
      stars: 0,
    });

    expect(line).toBe(`M${left} ${bottom} L${right} ${bottom}`);
  });

  it('draws a flat series as a straight line', () => {
    const { line } = buildStarHistoryChart([{ date: '2025-01-01T00:00:00Z', stars: 30 }], {
      date: '2025-06-01T00:00:00Z',
      stars: 30,
    });

    expect(line).toBe(`M${left} ${top} L${right} ${top}`);
  });

  it('marks every new year inside the range', () => {
    const { ticks } = buildStarHistoryChart(points, current);

    expect(ticks.map(({ label }) => label)).toEqual(['2021', '2022']);
    expect(ticks[0].x).toBeGreaterThan(left);
    expect(ticks[1].x).toBeLessThan(right);
  });

  it('thins the years out on a long history', () => {
    const { ticks } = buildStarHistoryChart([{ date: '2008-02-01T00:00:00Z', stars: 0 }], {
      date: '2026-10-01T00:00:00Z',
      stars: 100_000,
    });
    const labels = ticks.map(({ label }) => Number(label));

    expect(labels).toEqual([2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].x - ticks[i - 1].x).toBeGreaterThanOrEqual(80);
    }
  });

  it('names the year at the left edge when the history stays within it', () => {
    const { ticks } = buildStarHistoryChart([{ date: '2026-02-01T00:00:00Z', stars: 0 }], {
      date: '2026-10-20T00:00:00Z',
      stars: 50,
    });

    expect(ticks).toEqual([{ x: 30, label: '2026' }]);
  });

  it('draws an unreadable date of today without NaN', () => {
    const { line, area, end, ticks } = buildStarHistoryChart(points, { date: 'garbage', stars: 7 });

    expect(line).not.toContain('NaN');
    expect(area).not.toContain('NaN');
    expect(Number.isFinite(end.x) && Number.isFinite(end.y)).toBe(true);
    expect(ticks).toEqual([]);
  });
});
