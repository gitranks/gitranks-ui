import { describe, expect, it } from 'vitest';

import { chooseGoal, type GoalCandidate, goalAmount, goalText, nextRoundRank, ROUND_RANKS } from './goals';

describe('nextRoundRank', () => {
  it.each([
    [41_206, 25_000],
    [25_000, 10_000],
    [25_001, 25_000],
    [101, 100],
    [11, 10],
    [10, null],
    [1, null],
    [312_000, 250_000],
    [600_000, 500_000],
    [1_200_000, 1_000_000],
    [3_000_000, 1_000_000],
  ])('#%i aims at %s', (rank, next) => {
    expect(nextRoundRank(rank)).toBe(next);
  });

  it('knows the round ranks up to a million', () => {
    expect(ROUND_RANKS.at(-1)).toBe(1_000_000);
    expect(ROUND_RANKS).toContain(250_000);
    expect(ROUND_RANKS).toContain(500_000);
  });
});

const candidate = (scope: GoalCandidate['scope'], targetRank: number, needed: number | null): GoalCandidate => ({
  scope,
  targetRank,
  needed,
  unit: 'stars',
  language: scope === 'language' ? 'Rust' : null,
  country: scope === 'country' ? 'Ukraine' : null,
});

describe('chooseGoal', () => {
  it('takes the smallest gap', () => {
    expect(chooseGoal([candidate('global', 25_000, 40), candidate('language', 25, 8)], 812)?.scope).toBe('language');
  });

  it('gives a tie to the narrower list: language, then country', () => {
    expect(chooseGoal([candidate('global', 1_000, 8), candidate('country', 10, 8)], 812)?.scope).toBe('country');
    expect(chooseGoal([candidate('country', 10, 8), candidate('language', 100, 8)], 812)?.scope).toBe('language');
  });

  it('names no goal past a quarter of the score', () => {
    expect(chooseGoal([candidate('global', 25_000, 204)], 812)).toBeNull();
    expect(chooseGoal([candidate('global', 25_000, 203)], 812)?.needed).toBe(203);
  });

  it('names no goal at #1 of every list', () => {
    expect(chooseGoal([candidate('global', 10, null), candidate('language', 10, null)], 90_000)).toBeNull();
    expect(chooseGoal([], 90_000)).toBeNull();
  });

  it('ignores a list already reached', () => {
    expect(chooseGoal([candidate('global', 1_000, 0), candidate('country', 10, 30)], 812)?.scope).toBe('country');
  });
});

describe('goal text', () => {
  it('writes a collection, never a bare language', () => {
    expect(goalText({ ...candidate('language', 25, 8), needed: 8 }, 'repo')).toBe('top 25 Rust repos');
    expect(goalText({ ...candidate('global', 25_000, 8), needed: 8 }, 'repo')).toBe('top 25,000 repos');
    expect(goalText({ ...candidate('global', 1_000, 8), needed: 8 }, 'user')).toBe('top 1,000 devs');
    expect(goalText({ ...candidate('language', 100, 8), needed: 8 }, 'user')).toBe('top 100 Rust devs');
    expect(goalText({ ...candidate('country', 10, 8), needed: 8 }, 'user')).toBe('top 10 devs in Ukraine');
  });

  it('counts in the unit of the ranking', () => {
    expect(goalAmount({ needed: 8, unit: 'stars' })).toBe('8 ★');
    expect(goalAmount({ needed: 120, unit: 'contributionStars' })).toBe('120 contribution ★');
    expect(goalAmount({ needed: 40, unit: 'followers' })).toBe('40 followers');
    expect(goalAmount({ needed: 1, unit: 'followers' })).toBe('1 follower');
  });
});
