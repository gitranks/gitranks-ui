import { describe, expect, it } from 'vitest';

import {
  articleFor,
  formatRatio,
  leadStargazer,
  listSeparator,
  othersParts,
  shownLegendRatio,
  starsBestView,
} from './stars-best';

describe('starsBestView', () => {
  it('is the full section from 20, the strip under it, and nothing without any', () => {
    expect(starsBestView({ total: 20 })).toBe('full');
    expect(starsBestView({ total: 1_284 })).toBe('full');
    expect(starsBestView({ total: 19 })).toBe('compact');
    expect(starsBestView({ total: 1 })).toBe('compact');
    expect(starsBestView({ total: 0 })).toBeNull();
    expect(starsBestView(null)).toBeNull();
    expect(starsBestView(undefined)).toBeNull();
  });
});

describe('formatRatio', () => {
  it('keeps one decimal under 10 and drops a zero one', () => {
    expect(formatRatio(4.23)).toBe('4.2×');
    expect(formatRatio(1.96)).toBe('2×');
    expect(formatRatio(12.4)).toBe('12×');
  });
});

describe('shownLegendRatio', () => {
  it('shows the ratio from 1.5 only', () => {
    expect(shownLegendRatio(1.5)).toBe(1.5);
    expect(shownLegendRatio(1.49)).toBeNull();
    expect(shownLegendRatio(null)).toBeNull();
    expect(shownLegendRatio(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('othersParts', () => {
  it('counts the others without the developer named first, highest tier first', () => {
    expect(
      othersParts(
        [
          { tier: 6, count: 2 },
          { tier: 7, count: 1 },
        ],
        { tier: 7 },
      ),
    ).toEqual(['2 Elites']);
    expect(
      othersParts(
        [
          { tier: 7, count: 2 },
          { tier: 6, count: 2 },
        ],
        { tier: 7 },
      ),
    ).toEqual(['1 more Legend', '2 Elites']);
  });

  it('is empty when the one named is the only one', () => {
    expect(othersParts([{ tier: 7, count: 1 }], { tier: 7 })).toEqual([]);
  });

  it('folds the third tier and below into "N more" past three tiers', () => {
    expect(
      othersParts([
        { tier: 7, count: 1 },
        { tier: 6, count: 3 },
        { tier: 5, count: 2 },
        { tier: 3, count: 4 },
      ]),
    ).toEqual(['1 Legend', '3 Elites', '6 more']);
  });

  it('says "more" for the named one\'s own tier', () => {
    expect(othersParts([{ tier: 6, count: 4 }], { tier: 6 })).toEqual(['3 more Elites']);
  });
});

describe('leadStargazer', () => {
  it('names the highest ranked with a login, else the highest ranked', () => {
    expect(leadStargazer([{ login: null }, { login: 'bo' }])).toEqual({ login: 'bo' });
    expect(leadStargazer([{ login: null }])).toEqual({ login: null });
    expect(leadStargazer([])).toBeUndefined();
  });
});

describe('articleFor', () => {
  it('takes "an" before a vowel', () => {
    expect(articleFor('Elite 3')).toBe('an');
    expect(articleFor('Advanced 1')).toBe('an');
    expect(articleFor('Legend 2')).toBe('a');
  });
});

describe('listSeparator', () => {
  it('reads as "a, b and c"', () => {
    expect([0, 1, 2].map((at) => listSeparator(at, 3))).toEqual(['', ', ', ' and ']);
    expect([0, 1].map((at) => listSeparator(at, 2))).toEqual(['', ' and ']);
  });
});
