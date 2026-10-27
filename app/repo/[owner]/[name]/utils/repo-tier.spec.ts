import { describe, expect, it } from 'vitest';

import { repoTierGoal } from './repo-tier';

const tiers = [
  { tier: 7, level: 5, maxRank: 49, minValue: 175_007 },
  { tier: 7, level: 4, maxRank: 247, minValue: 76_645 },
  { tier: 6, level: 1, maxRank: 14_730, minValue: 4_427 },
  { tier: 5, level: 5, maxRank: 17_666, minValue: 3_755 },
];

describe('repoTierGoal', () => {
  it('says how many repositories share the top bucket', () => {
    expect(repoTierGoal({ tier: 7, level: 5 }, 251_726, tiers)).toBe('Top 49 repositories on GitHub');
  });

  it('says the stars missing to the next bucket', () => {
    expect(repoTierGoal({ tier: 7, level: 4 }, 76_700, tiers)).toBe('98,308 stars to Supernova 5');
    expect(repoTierGoal({ tier: 5, level: 5 }, 4_427, tiers)).toBe('1 star to Galaxy 1');
    expect(repoTierGoal({ tier: 5, level: 5 }, 4_426, tiers)).toBe('2 stars to Galaxy 1');
  });

  it('says nothing without a table, for an unknown bucket, or when the stars already reach the next one', () => {
    expect(repoTierGoal({ tier: 6, level: 1 }, 5_000, null)).toBeNull();
    expect(repoTierGoal({ tier: 3, level: 2 }, 600, tiers)).toBeNull();
    expect(repoTierGoal({ tier: 5, level: 5 }, 4_500, tiers)).toBeNull();
    expect(repoTierGoal({ tier: 5, level: 5 }, 4_428, tiers)).toBeNull();
  });

  it('says nothing when the table is from another ranking than the repository’s bucket', () => {
    // The repository is Planet 5 of a 5.3M-repo ranking; the cached table is the earlier, smaller one.
    const stale = [
      { tier: 5, level: 1, minRank: 26_000, maxRank: 29_657, minValue: 2_305 },
      { tier: 4, level: 5, minRank: 29_658, maxRank: 35_283, minValue: 1_931 },
    ];
    expect(repoTierGoal({ tier: 4, level: 5, minRank: 315_904, maxRank: 379_078 }, 143, stale)).toBeNull();

    const fresh = [
      { tier: 5, level: 1, minRank: 284_315, maxRank: 315_903, minValue: 173 },
      { tier: 4, level: 5, minRank: 315_904, maxRank: 379_078, minValue: 139 },
    ];
    expect(repoTierGoal({ tier: 4, level: 5, minRank: 315_904, maxRank: 379_078 }, 143, fresh)).toBe(
      '31 stars to Nova 1',
    );
  });
});
