import { describe, expect, it } from 'vitest';

import { buildRankHistory } from './rank-history';

const scores = { s: 150, c: 40, f: 9 };

describe('buildRankHistory', () => {
  it('lists the current values, then the monthly snapshots newest first', () => {
    const { columns, rows } = buildRankHistory({
      ranks: { s: 10, c: 200, f: 3 },
      scores,
      rankSnapshots: { '2026-09-01': { s: 12, c: 210, f: 3 }, '2026-10-01': { s: 11, c: 205, f: 3 } },
      scoreSnapshots: { '2026-09-01': { s: 140, c: 38, f: 9 }, '2026-10-01': { s: 145, c: 39, f: 9 } },
    });

    expect(columns).toEqual(['s', 'c', 'f']);
    expect(rows.map((row) => [row.date, row.label])).toEqual([
      [null, 'Current'],
      ['2026-10-01', 'Oct 1, 2026'],
      ['2026-09-01', 'Sep 1, 2026'],
    ]);
    expect(rows[0].cells.s).toEqual({ rank: 10, score: 150 });
    expect(rows[2].cells.c).toEqual({ rank: 210, score: 38 });
  });

  it('keeps only the rankings the profile was ranked in', () => {
    const { columns } = buildRankHistory({
      ranks: { s: 10 },
      scores,
      rankSnapshots: { '2026-10-01': { s: 11, c: null, f: null } },
    });

    expect(columns).toEqual(['s']);
  });

  it('lists the newest rank snapshots only, and no month that has a score but no rank snapshot', () => {
    const rankSnapshots = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`2026-0${i + 1}-01`, { s: 100 - i }]),
    );
    const { rows } = buildRankHistory({
      ranks: { s: 90 },
      scores,
      rankSnapshots,
      scoreSnapshots: { '2026-10-01': { s: 140 }, '2026-09-01': { s: 130 } },
      months: 3,
    });

    expect(rows.map((row) => row.date)).toEqual([null, '2026-09-01', '2026-08-01', '2026-07-01']);
    expect(rows[1].cells.s).toEqual({ rank: 92, score: 130 });
    expect(rows[2].cells.s).toEqual({ rank: 93, score: undefined });
  });

  it('says a month was not ranked in a ranking only when its snapshot has no rank for it', () => {
    const { rows } = buildRankHistory({
      ranks: { s: 10, c: 20 },
      scores,
      rankSnapshots: { '2026-10-01': { s: 11, c: null } },
    });

    expect(rows[1].cells.c.rank).toBeUndefined();
    expect(rows[1].cells.s.rank).toBe(11);
  });

  it('is empty without a monthly rank to compare with', () => {
    expect(buildRankHistory({ ranks: { s: 10 }, scores }).rows).toEqual([]);
    expect(buildRankHistory({ ranks: { s: 10 }, scores, scoreSnapshots: { '2026-10-01': { s: 140 } } }).rows).toEqual(
      [],
    );
    expect(buildRankHistory({ ranks: null, scores: {}, rankSnapshots: { '2026-10-01': {} } }).rows).toEqual([]);
  });

  it('skips entries that are not dated snapshots', () => {
    const { rows } = buildRankHistory({
      ranks: { s: 10 },
      scores,
      rankSnapshots: { latest: { s: 1 }, '2026-10-01': { s: 'x' }, '2026-09-01': null, '2026-08-01': { s: 12 } },
    });

    expect(rows.map((row) => row.date)).toEqual([null, '2026-10-01', '2026-08-01']);
    expect(rows[1].cells.s.rank).toBeUndefined();
  });
});
