import { describe, expect, it } from 'vitest';

import { matchRouteName } from './match-route-name';

describe('matchRouteName', () => {
  const names = ['Germany', 'United States', 'C#', 'GERMANY'];

  it('prefers an exact match', () => {
    expect(matchRouteName(names, 'GERMANY')).toBe('GERMANY');
    expect(matchRouteName(names, 'Germany')).toBe('Germany');
  });

  it('falls back to a case-insensitive match', () => {
    expect(matchRouteName(names, 'germany')).toBe('Germany');
    expect(matchRouteName(names, 'united states')).toBe('United States');
    expect(matchRouteName(names, 'c#')).toBe('C#');
  });

  it('returns undefined when nothing matches', () => {
    expect(matchRouteName(names, 'Nowhere')).toBeUndefined();
    expect(matchRouteName([], 'Germany')).toBeUndefined();
  });
});
