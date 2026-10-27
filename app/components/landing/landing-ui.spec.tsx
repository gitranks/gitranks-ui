import { describe, expect, it } from 'vitest';

import { formatCompact, tierAt } from './landing-ui';
import { tierLabel } from '@/components/tier-chip/tier-chip';

const TIERS = [
  { tier: 7, level: 5, minRank: 1, maxRank: 10, minValue: 1000 },
  { tier: 7, level: 4, minRank: 11, maxRank: 50, minValue: 500 },
  { tier: 1, level: 1, minRank: 51, maxRank: 1000, minValue: 5 },
];

describe('tierAt', () => {
  it('finds the tier whose rank range holds the position', () => {
    expect(tierAt(TIERS, 1)).toMatchObject({ tier: 7, level: 5 });
    expect(tierAt(TIERS, 11)).toMatchObject({ tier: 7, level: 4 });
    expect(tierAt(TIERS, 1000)).toMatchObject({ tier: 1, level: 1 });
  });

  it('gives null outside the ranges, without a position or without cut-offs', () => {
    expect(tierAt(TIERS, 1001)).toBeNull();
    expect(tierAt(TIERS, null)).toBeNull();
    expect(tierAt(null, 3)).toBeNull();
  });
});

describe('tierLabel', () => {
  it('names the tier and its level', () => {
    expect(tierLabel({ tier: 7, level: 5 })).toBe('Legend 5');
    expect(tierLabel({ tier: 1, level: 3 })).toBe('Rookie 3');
  });
});

describe('formatCompact', () => {
  it('keeps one decimal by default and two when precise', () => {
    expect(formatCompact(1_669_787)).toBe('1.7M');
    expect(formatCompact(1_669_787, true)).toBe('1.67M');
    expect(formatCompact(null)).toBe('');
  });
});
