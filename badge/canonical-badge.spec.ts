import { describe, expect, it } from 'vitest';

import { isCanonicalBadgeAvailable } from './canonical-badge';

describe('isCanonicalBadgeAvailable', () => {
  it('offers a ranking badge only from the entry score up', () => {
    expect(isCanonicalBadgeAvailable('followers-rank', { f: 4 }, undefined)).toBe(false);
    expect(isCanonicalBadgeAvailable('followers-score', { f: 4 }, undefined)).toBe(false);
    expect(isCanonicalBadgeAvailable('followers-rank', { f: 5 }, undefined)).toBe(true);
  });

  it('treats a missing score as not ranked', () => {
    expect(isCanonicalBadgeAvailable('stars-rank', { s: null }, undefined)).toBe(false);
    expect(isCanonicalBadgeAvailable('contributions-score', {}, undefined)).toBe(false);
  });

  it('also needs a rank or a provisional one when the ranks are known', () => {
    expect(isCanonicalBadgeAvailable('stars-rank', { s: 9 }, { s: 120 })).toBe(true);
    expect(isCanonicalBadgeAvailable('stars-score', { s: 9 }, { sProvisional: 130 })).toBe(true);
    expect(isCanonicalBadgeAvailable('stars-score', { s: 9 }, { c: 40 })).toBe(false);
    expect(isCanonicalBadgeAvailable('stars-rank', { s: 9 }, null)).toBe(false);
  });
});
