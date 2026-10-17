import { describe, expect, it } from 'vitest';

import { getRankedIn } from './is-ranked-in';

describe('getRankedIn', () => {
  it('lists the rankings a profile is in, globally and in its country', () => {
    expect(
      getRankedIn({ s: 12, c: 7, f: 4, country: 'Ukraine' }, { s: 120, cProvisional: 900 }, { s: 3, c: 40 }),
    ).toEqual({ global: ['s', 'c'], country: ['s', 'c'] });
  });

  it('has no country rankings without a country', () => {
    expect(getRankedIn({ s: 12, country: null }, { s: 120 }, { s: 3 })).toEqual({ global: ['s'], country: [] });
  });

  it('needs a country rank or a provisional one, as the badge route does', () => {
    expect(getRankedIn({ s: 12, c: 7, country: 'Ukraine' }, { s: 120, c: 900 }, { cProvisional: 41 })).toEqual({
      global: ['s', 'c'],
      country: ['c'],
    });
    expect(getRankedIn({ s: 12, country: 'Ukraine' }, { s: 120 }, null)).toEqual({ global: ['s'], country: [] });
  });

  it('needs the entry score in both contexts', () => {
    expect(getRankedIn({ f: 4, country: 'Ukraine' }, { f: 70 }, { f: 2 })).toEqual({ global: [], country: [] });
  });
});
