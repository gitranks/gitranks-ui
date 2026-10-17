import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isCanonicalBadgeAvailable, listCanonicalBadgeImageUrls } from './canonical-badge';

describe('isCanonicalBadgeAvailable', () => {
  it('offers a ranking badge only from the entry score up', () => {
    expect(isCanonicalBadgeAvailable('followers-rank', { f: 4 })).toBe(false);
    expect(isCanonicalBadgeAvailable('followers-score', { f: 4 })).toBe(false);
    expect(isCanonicalBadgeAvailable('followers-rank', { f: 5 })).toBe(true);
  });

  it('treats a missing score as not ranked', () => {
    expect(isCanonicalBadgeAvailable('stars-rank', { s: null })).toBe(false);
    expect(isCanonicalBadgeAvailable('contributions-score', {})).toBe(false);
  });

  it('also needs a rank or a provisional one when the ranks are known', () => {
    expect(isCanonicalBadgeAvailable('stars-rank', { s: 9 }, { s: 120 })).toBe(true);
    expect(isCanonicalBadgeAvailable('stars-score', { s: 9 }, { sProvisional: 130 })).toBe(true);
    expect(isCanonicalBadgeAvailable('stars-score', { s: 9 }, { c: 40 })).toBe(false);
    expect(isCanonicalBadgeAvailable('stars-rank', { s: 9 }, null)).toBe(false);
  });
});

describe('listCanonicalBadgeImageUrls', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('lists the badges of the rankings the profile is in and nothing else', () => {
    expect(listCanonicalBadgeImageUrls('newcomer', { s: 12, c: 7, f: 4 })).toEqual([
      'https://example.test/badges/newcomer/stars-rank.png',
      'https://example.test/badges/newcomer/contributions-rank.png',
      'https://example.test/badges/newcomer/stars-score.png',
      'https://example.test/badges/newcomer/contributions-score.png',
    ]);
  });

  it('lists nothing for a profile that is in no ranking', () => {
    expect(listCanonicalBadgeImageUrls('newcomer', { s: 0, c: 3, f: 1 })).toEqual([]);
  });
});
