import { describe, expect, it } from 'vitest';

import { COUNTRY_SUMMARY_ORDERS, isInvalidRankingPath, LANGUAGE_SUMMARY_ORDERS, RANKING_TYPES } from './ranking-routes';
import { CountrySummaryOrder, LanguageSummaryOrder } from '@/types/generated/graphql';
import { RankingTypeClient } from '@/types/ranking.types';

describe('isInvalidRankingPath', () => {
  it('keeps the literal sets in sync with the enums', () => {
    expect([...RANKING_TYPES].sort()).toEqual(Object.values(RankingTypeClient).sort());
    expect([...COUNTRY_SUMMARY_ORDERS].sort()).toEqual(
      Object.values(CountrySummaryOrder)
        .map((o) => o.toLowerCase())
        .sort(),
    );
    expect([...LANGUAGE_SUMMARY_ORDERS].sort()).toEqual(
      Object.values(LanguageSummaryOrder)
        .map((o) => o.toLowerCase())
        .sort(),
    );
  });

  it.each([
    '/',
    '/by/stars',
    '/by/stars/1',
    '/by/followers/1001',
    '/country/Germany/contributions/3',
    '/country/United%20States/stars/1001',
    '/country/germany/stars/1',
    '/language/C%23/global/51',
    '/language/Rust/Germany/1',
    '/languages/global/score/1',
    '/languages/Germany/SIZE/40',
    '/languages/global/users/1000',
    '/countries/users/2',
    '/countries/STARS/1',
    '/orgs/51',
    '/profile/karpathy',
    '/org/openai',
    '/insights/abc',
    // Not a ranking route at all: routing answers these already.
    '/by/stars/1/extra',
  ])('lets %s through', (path) => {
    expect(isInvalidRankingPath(path)).toBe(false);
  });

  it.each([
    '/by/bogus',
    '/by/bogus/1',
    '/by/Stars/1',
    '/by/stars/0',
    '/by/stars/01',
    '/by/stars/abc',
    '/by/stars/1002',
    '/by/stars/99999',
    '/country/Germany/bogus/1',
    '/country/Germany/stars/1002',
    '/language/Rust/global/52',
    '/language/Rust/global/x',
    '/languages/global/bogus/1',
    '/languages/global/score/0',
    '/languages/global/score/1001',
    '/languages/global/score/999999999',
    '/countries/bogus/1',
    '/countries/stars/1.5',
    '/orgs/52',
    '/orgs/abc',
  ])('rejects %s', (path) => {
    expect(isInvalidRankingPath(path)).toBe(true);
  });
});
