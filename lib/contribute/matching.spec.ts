import { describe, expect, it } from 'vitest';

import { MATCHING_LINE_MS, matchingLinesOf, matchingTicksOf } from './matching';

describe('matchingTicksOf', () => {
  it('ticks a line each 0.9s, and holds the last until the picks are computed', () => {
    expect(matchingTicksOf(0, false)).toBe(0);
    expect(matchingTicksOf(MATCHING_LINE_MS - 1, true)).toBe(0);
    expect(matchingTicksOf(MATCHING_LINE_MS, false)).toBe(1);
    expect(matchingTicksOf(MATCHING_LINE_MS * 3, false)).toBe(3);
    expect(matchingTicksOf(60_000, false)).toBe(3);
    expect(matchingTicksOf(MATCHING_LINE_MS * 4, true)).toBe(4);
  });

  it('keeps each line on screen its 0.9s even when the picks are ready at once', () => {
    expect(matchingTicksOf(MATCHING_LINE_MS * 2, true)).toBe(2);
    expect(matchingTicksOf(MATCHING_LINE_MS * 4 - 1, true)).toBe(3);
  });
});

describe('matchingLinesOf', () => {
  it("names the profile's languages, and reads without them", () => {
    expect(matchingLinesOf(['Rust', 'Go'])[1]).toBe('Reading your profile: Rust, Go');
    expect(matchingLinesOf([])[1]).toBe('Reading your profile');
    expect(matchingLinesOf([])).toHaveLength(4);
  });
});
