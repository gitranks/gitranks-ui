import { describe, expect, it } from 'vitest';

import { repoMid, userMid } from './fixtures';
import { monthKeysOf } from './month';
import { bestCompletedMonth, raceState, repoRace, userClimbRace, userStarsRace } from './race';

const at = (day: number) => new Date(Date.UTC(2026, 9, day, 12));

describe('raceState', () => {
  it.each([
    [{ current: 0, last: 10, dayOfMonth: 20 }, 'hidden'],
    [{ current: -4, last: 10, dayOfMonth: 20 }, 'hidden'],
    [{ current: null, last: 10, dayOfMonth: 20 }, 'hidden'],
    [{ current: 40, last: 10, dayOfMonth: 3 }, 'plain'],
    [{ current: 2, last: 1, dayOfMonth: 20 }, 'plain'],
    [{ current: 40, last: null, dayOfMonth: 20 }, 'plain'],
    [{ current: 40, last: 0, dayOfMonth: 20 }, 'plain'],
    [{ current: 38, last: 47, dayOfMonth: 20 }, 'behind'],
    [{ current: 47, last: 47, dayOfMonth: 20 }, 'behind'],
    [{ current: 52, last: 47, dayOfMonth: 20 }, 'beaten'],
    [{ current: 212, last: 47, best: 180, dayOfMonth: 20 }, 'record'],
  ] as const)('%o is %s', (input, kind) => {
    expect(raceState(input).kind).toBe(kind);
  });

  it('counts what is left to beat last month, one more than the gap', () => {
    expect(raceState({ current: 38, last: 47, dayOfMonth: 20 })).toEqual({ kind: 'behind', toBeat: 10 });
    expect(raceState({ current: 47, last: 47, dayOfMonth: 20 })).toEqual({ kind: 'behind', toBeat: 1 });
  });

  it('calls a record only above every earlier month and from 10 up', () => {
    expect(raceState({ current: 9, last: 2, best: 5, dayOfMonth: 20 }).kind).toBe('beaten');
    expect(raceState({ current: 180, last: 47, best: 180, dayOfMonth: 20 }).kind).toBe('beaten');
    expect(raceState({ current: 212, last: 47, best: null, dayOfMonth: 20 }).kind).toBe('beaten');
  });

  it('waits for the 4th even for a record', () => {
    expect(raceState({ current: 212, last: 47, best: 180, dayOfMonth: 3 }).kind).toBe('plain');
  });
});

describe('month keys', () => {
  it('builds the API keys in UTC, across the new year', () => {
    expect(monthKeysOf(new Date('2026-10-20T12:00:00Z'))).toEqual({
      thisKey: '2026-10-01',
      lastKey: '2026-09-01',
      lastName: 'Sep',
      dayOfMonth: 20,
    });
    expect(monthKeysOf(new Date('2027-01-02T00:30:00Z'))).toMatchObject({
      thisKey: '2027-01-01',
      lastKey: '2026-12-01',
      lastName: 'Dec',
    });
  });
});

describe('repoRace', () => {
  it('reads last month from the month starts', () => {
    // 726 on the 1st of September, 774 on the 1st of October: September gained 48.
    expect(repoRace(repoMid, at(20))).toMatchObject({
      current: 38,
      last: 48,
      lastName: 'Sep',
      state: { kind: 'behind', toBeat: 11 },
    });
    expect(repoRace({ ...repoMid, gainedThisMonth: 52 }, at(20)).state.kind).toBe('beaten');
  });

  it('knows no last month without both starts', () => {
    const race = repoRace({ ...repoMid, monthStarts: { '2026-10-01': 774 } }, at(20));
    expect(race.last).toBeNull();
    expect(race.state.kind).toBe('plain');
  });

  it('counts what is left to beat a bigger last month', () => {
    expect(repoRace({ ...repoMid, gainedThisMonth: 20 }, at(20)).state).toEqual({ kind: 'behind', toBeat: 29 });
  });

  it('calls a record from the star history', () => {
    const history = {
      points: [
        { date: '2026-07-01T00:00:00Z', stars: 600 },
        { date: '2026-08-01T00:00:00Z', stars: 700 },
        { date: '2026-09-01T00:00:00Z', stars: 726 },
        { date: '2026-10-01T00:00:00Z', stars: 774 },
      ],
      current: { date: '2026-10-20T00:00:00Z', stars: 986 },
      complete: true,
    };
    expect(repoRace({ ...repoMid, gainedThisMonth: 212, history }, at(20)).state.kind).toBe('record');
    expect(repoRace({ ...repoMid, gainedThisMonth: 90, history }, at(20)).state.kind).toBe('beaten');
  });

  it('hides on the 1st', () => {
    expect(repoRace({ ...repoMid, gainedThisMonth: 0 }, at(1)).state.kind).toBe('hidden');
  });
});

describe('developer races', () => {
  it('races stars on their own repos', () => {
    // 640 now, 602 on the 1st, 590 on the 1st of September.
    expect(userStarsRace(userMid, at(20))).toMatchObject({ current: 38, last: 12, state: { kind: 'beaten' } });
    expect(userStarsRace({ ...userMid, s: 610 }, at(20)).state).toEqual({ kind: 'behind', toBeat: 5 });
    expect(userStarsRace({ ...userMid, s: 640 }, at(2)).state.kind).toBe('plain');
    expect(userStarsRace({ ...userMid, s: 602 }, at(20)).state.kind).toBe('hidden');
    expect(userStarsRace({ ...userMid, snapshots: null }, at(20)).state.kind).toBe('hidden');
  });

  it('races places climbed in the stars rank', () => {
    // #41,516 on the 1st, #41,204 now: 312 places; September climbed 1,484.
    expect(userClimbRace(userMid, at(20))).toMatchObject({
      current: 312,
      last: 1_484,
      state: { kind: 'behind', toBeat: 1_173 },
    });
    const fell = { ...userMid, rankGlobal: { ...userMid.rankGlobal!, s: 42_000 } };
    expect(userClimbRace(fell, at(20)).state.kind).toBe('hidden');
  });

  it('has no record state', () => {
    expect(userStarsRace({ ...userMid, s: 5_000 }, at(20)).state.kind).toBe('beaten');
  });
});

describe('bestCompletedMonth', () => {
  const point = (date: string, stars: number) => ({ date: `${date}T00:00:00.000Z`, stars });
  const history = (points: { date: string; stars: number }[], complete = true) => ({
    points,
    current: { date: '2026-10-20T00:00:00Z', stars: 2_000 },
    complete,
  });

  it('takes the best gain between months one month apart, before this month', () => {
    const points = [
      point('2026-06-01', 100),
      point('2026-07-01', 180),
      point('2026-08-01', 210),
      point('2026-09-01', 300),
      point('2026-10-01', 900),
    ];
    // October's start closes September: +600. This month (October to today) never counts.
    expect(bestCompletedMonth(history(points), '2026-10-01')).toBe(600);
    expect(bestCompletedMonth(history(points), '2026-09-01')).toBe(90);
  });

  it('never reads a jump across missing months as one month', () => {
    const points = [point('2021-03-01', 0), point('2024-01-01', 5_000), point('2024-02-01', 5_040)];
    expect(bestCompletedMonth(history(points), '2026-10-01')).toBe(40);
  });

  it('ignores points that are not a month start, such as the creation date', () => {
    const points = [{ date: '2026-07-14T09:30:00Z', stars: 0 }, point('2026-08-01', 50), point('2026-09-01', 70)];
    expect(bestCompletedMonth(history(points), '2026-10-01')).toBe(20);
  });

  it('knows no best month without a complete history', () => {
    const points = [point('2026-08-01', 50), point('2026-09-01', 70)];
    expect(bestCompletedMonth(history(points, false), '2026-10-01')).toBeNull();
    expect(bestCompletedMonth(null, '2026-10-01')).toBeNull();
  });

  it('calls no record from an incomplete history', () => {
    const points = [point('2026-08-01', 700), point('2026-09-01', 726), point('2026-10-01', 774)];
    expect(repoRace({ ...repoMid, gainedThisMonth: 212, history: history(points, false) }, at(20)).state.kind).toBe(
      'beaten',
    );
    expect(repoRace({ ...repoMid, gainedThisMonth: 212, history: history(points) }, at(20)).state.kind).toBe('record');
  });
});
