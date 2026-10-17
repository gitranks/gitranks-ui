import { describe, expect, it } from 'vitest';

import { formatTimeLeft, timeLeftUntil } from './format-time-left';

const MINUTE = 60_000;

describe('formatTimeLeft', () => {
  it.each([
    [0, '1 min'],
    [20 * 1_000, '1 min'],
    [20 * MINUTE, '20 min'],
    [60 * MINUTE, '1 h'],
    [(13 * 60 + 20) * MINUTE, '13 h 20 min'],
    [24 * 60 * MINUTE, '24 h'],
    [-5 * MINUTE, '1 min'],
  ])('%i ms reads as "%s"', (ms, expected) => {
    expect(formatTimeLeft(ms)).toBe(expected);
  });

  it('rounds up, so the time shown is never already over', () => {
    expect(formatTimeLeft(MINUTE + 1)).toBe('2 min');
  });

  it('counts down to an ISO date', () => {
    const now = Date.parse('2026-10-17T12:00:00Z');
    expect(timeLeftUntil('2026-10-18T01:20:00.000Z', now)).toBe('13 h 20 min');
  });
});
