import { describe, expect, it } from 'vitest';

import {
  BUILD_DEFAULT_TIME_ZONE,
  buildZoneOf,
  dayKeyIn,
  daysFromTo,
  dayWordsIn,
  isTimeZone,
  timeWordsIn,
} from './zone';

describe('the zone Build writes dates in', () => {
  it('is the zone the person saved, or the default when they saved none or one that is not a zone', () => {
    expect(buildZoneOf('Europe/Kyiv')).toBe('Europe/Kyiv');
    expect(buildZoneOf(null)).toBe(BUILD_DEFAULT_TIME_ZONE);
    expect(buildZoneOf(undefined)).toBe(BUILD_DEFAULT_TIME_ZONE);
    expect(buildZoneOf('')).toBe(BUILD_DEFAULT_TIME_ZONE);
    expect(buildZoneOf('Mars/Olympus')).toBe(BUILD_DEFAULT_TIME_ZONE);
    expect(BUILD_DEFAULT_TIME_ZONE).toBe('America/New_York');
  });

  it('knows a zone from a name that is not one', () => {
    expect(isTimeZone('Asia/Tokyo')).toBe(true);
    expect(isTimeZone('UTC')).toBe(true);
    expect(isTimeZone('Not/AZone')).toBe(false);
    expect(isTimeZone(3)).toBe(false);
    expect(isTimeZone('')).toBe(false);
  });
});

describe('a day in a zone', () => {
  // 02:30 UTC on 27 Nov is still 26 Nov in New York, and already the morning of 27 Nov in Tokyo.
  const lateEvening = '2026-11-27T02:30:00.000Z';

  it('is the day the moment falls on there', () => {
    expect(dayKeyIn(lateEvening, 'America/New_York')).toBe('2026-11-26');
    expect(dayKeyIn(lateEvening, 'Asia/Tokyo')).toBe('2026-11-27');
    expect(dayKeyIn(new Date(lateEvening), 'America/New_York')).toBe('2026-11-26');
  });

  it('is read in UTC when no zone is known, so every machine writes the same day', () => {
    expect(dayKeyIn(lateEvening)).toBe('2026-11-27');
    expect(dayKeyIn(lateEvening, 'Not/AZone')).toBe('2026-11-27');
  });

  it('keeps a day alone as it is, in any zone', () => {
    expect(dayKeyIn('2026-12-03', 'Pacific/Kiritimati')).toBe('2026-12-03');
    expect(dayWordsIn('2026-12-03', 'Pacific/Pago_Pago')).toBe('3 Dec');
  });

  it('is written "26 Nov", with the year when asked, and empty for a moment that cannot be read', () => {
    expect(dayWordsIn(lateEvening, 'America/New_York')).toBe('26 Nov');
    expect(dayWordsIn(lateEvening, 'America/New_York', { year: true })).toBe('26 Nov 2026');
    expect(dayWordsIn('not a date', 'UTC')).toBe('');
    expect(dayKeyIn('not a date')).toBeNull();
  });

  it('writes the time of a moment there', () => {
    expect(timeWordsIn(lateEvening, 'America/New_York')).toBe('21:30');
    expect(timeWordsIn(lateEvening)).toBe('02:30');
    expect(timeWordsIn('not a date')).toBe('');
  });

  it('counts whole days from one local day to another', () => {
    expect(daysFromTo('2026-11-26', '2026-12-03')).toBe(7);
    expect(daysFromTo('2026-12-03', '2026-11-26')).toBe(-7);
    // Across the change of the clocks, a day is still one day.
    expect(daysFromTo('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysFromTo(null, '2026-12-03')).toBeNull();
    expect(daysFromTo('soon', '2026-12-03')).toBeNull();
  });
});
