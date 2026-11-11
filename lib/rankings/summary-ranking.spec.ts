import { describe, expect, it } from 'vitest';

import {
  biggestClimb,
  competitionRanks,
  findStandOuts,
  formatShare,
  positionsByName,
  previousSnapshotDate,
  shareOf,
  snapshotMonth,
  totalOf,
} from './summary-ranking';

describe('previousSnapshotDate', () => {
  it('steps back one month, across a year', () => {
    expect(previousSnapshotDate('2026-11-01')).toBe('2026-10-01');
    expect(previousSnapshotDate('2026-01-01')).toBe('2025-12-01');
  });

  it('refuses anything that is not a snapshot date', () => {
    expect(previousSnapshotDate(undefined)).toBeNull();
    expect(previousSnapshotDate('2026-11-02')).toBeNull();
    expect(previousSnapshotDate('2026-13-01')).toBeNull();
    expect(previousSnapshotDate('soon')).toBeNull();
  });
});

describe('snapshotMonth', () => {
  it('names the month', () => {
    expect(snapshotMonth('2026-10-01')).toBe('October');
  });
});

describe('positions, totals and shares', () => {
  const rows = [
    { name: 'a', v: 6 },
    { name: 'b', v: 3 },
    { name: 'c', v: 1 },
  ];

  it('numbers rows from 1', () => {
    expect(positionsByName(rows, (row) => row.name)).toEqual(
      new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]),
    );
  });

  it('adds and shares', () => {
    expect(totalOf(rows, (row) => row.v)).toBe(10);
    expect(shareOf(6, 10)).toBe(0.6);
    expect(shareOf(6, 0)).toBe(0);
  });

  it('writes shares to one decimal', () => {
    expect(formatShare(0.2555)).toBe('25.6%');
    expect(formatShare(0.0004)).toBe('<0.1%');
    expect(formatShare(0)).toBe('0.0%');
  });
});

describe('competitionRanks', () => {
  it('shares a rank between equal values, whatever order the rows came in', () => {
    const rows = [
      { name: 'c', v: 2 },
      { name: 'a', v: 9 },
      { name: 'b', v: 2 },
      { name: 'd', v: 1 },
    ];
    expect(
      competitionRanks(
        rows,
        (r) => r.name,
        (r) => r.v,
      ),
    ).toEqual(
      new Map([
        ['a', 1],
        ['c', 2],
        ['b', 2],
        ['d', 4],
      ]),
    );
  });
});

describe('biggestClimb', () => {
  it('finds the largest rise and ignores falls', () => {
    const rows = [
      { rank: 1, previous: 1 },
      { rank: 2, previous: 5 },
      { rank: 3, previous: 2 },
      { rank: 4, previous: 7 },
      { rank: 5, previous: null },
    ];
    expect(biggestClimb(rows)).toBe(rows[1]);
  });

  it('is null when nothing rose', () => {
    expect(biggestClimb([{ rank: 1, previous: 1 }])).toBeNull();
  });
});

describe('findStandOuts', () => {
  // Belgium on 1 Nov 2026: Lua #3 (#21 worldwide), PHP #4 (#15), Shell up from #10 to #6, MDX #24 (#38).
  const belgium = [
    { language: 'Python', rank: 1, previous: 1, worldRank: 1 },
    { language: 'JavaScript', rank: 2, previous: 2, worldRank: 2 },
    { language: 'Lua', rank: 3, previous: 3, worldRank: 21 },
    { language: 'PHP', rank: 4, previous: 4, worldRank: 15 },
    { language: 'TypeScript', rank: 5, previous: 5, worldRank: 3 },
    { language: 'Shell', rank: 6, previous: 10, worldRank: 9 },
    { language: 'MDX', rank: 24, previous: 24, worldRank: 38 },
    { language: 'Zig', rank: 30, previous: 60, worldRank: 90 },
  ];

  it('names the highest languages above their worldwide place, then the biggest climb', () => {
    expect(findStandOuts(belgium).map(({ kind, row }) => [kind, row.language])).toEqual([
      ['above-world', 'Lua'],
      ['above-world', 'PHP'],
      ['climb', 'Shell'],
    ]);
  });

  it('leaves out small climbs and languages below the window', () => {
    const quiet = belgium.map((row) => (row.language === 'Shell' ? { ...row, previous: 7 } : row));
    expect(findStandOuts(quiet).map(({ row }) => row.language)).toEqual(['Lua', 'PHP']);
  });

  it('is empty for a country that ranks like the world', () => {
    expect(findStandOuts([{ language: 'Python', rank: 1, previous: 1, worldRank: 1 }])).toEqual([]);
  });
});
