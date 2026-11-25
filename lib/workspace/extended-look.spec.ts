// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { isLookExtended, markExtendedLook } from './extended-look';

const NOW = Date.parse('2026-10-28T12:00:00.000Z');
const LATER = '2026-10-28T12:30:00.000Z';

afterEach(() => window.localStorage.clear());

describe('the mark of a look held longer on the way into an onboarding', () => {
  it('names its issue until the hold ends', () => {
    markExtendedLook({ id: 'q7k2m9xa', until: LATER });
    expect(isLookExtended('q7k2m9xa', NOW)).toBe(true);
    expect(isLookExtended('other123', NOW)).toBe(false);
  });

  it('ends with the hold, and is dropped then', () => {
    markExtendedLook({ id: 'q7k2m9xa', until: LATER });
    expect(isLookExtended('q7k2m9xa', Date.parse(LATER))).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it('keeps nothing for an id that is not a mask id, or a time that is not one', () => {
    markExtendedLook({ id: '../x', until: LATER });
    markExtendedLook({ id: 'q7k2m9xa', until: 'soon' });
    expect(window.localStorage.length).toBe(0);
  });

  it('reads a broken record as no mark', () => {
    window.localStorage.setItem('gitranks:extended-look', '{not json');
    expect(isLookExtended('q7k2m9xa', NOW)).toBe(false);
  });
});
