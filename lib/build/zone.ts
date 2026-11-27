/*
 * The one time zone every date of Build is written in: the zone the API counts the person's days in. That is the zone
 * they saved, or the API's default when they saved none, so a "Built on" day and the gold test's day, which the API
 * works out in that zone, never disagree. Pure: the pages and their specs read the same rules.
 */

import { API_DEFAULT_TIME_ZONE } from '@/lib/workspace/email-settings';

/** The zone the API counts a person's days in when they saved none: the same one Learn counts in. */
export const BUILD_DEFAULT_TIME_ZONE = API_DEFAULT_TIME_ZONE;

/** Whether a value names a time zone this runtime knows. */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** The zone the API counts days in, from the zone the person saved: that one when it is a zone, else the default. */
export const buildZoneOf = (saved: string | null | undefined): string =>
  isTimeZone(saved) ? saved : BUILD_DEFAULT_TIME_ZONE;

/** A day alone, as the API writes a local day: `2026-12-03`. */
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A zone that can be used: UTC for none, so a page that knows no zone writes the same dates on every machine. */
const usable = (zone: string | undefined) => (zone && isTimeZone(zone) ? zone : 'UTC');

/** The day a moment falls on in a zone (UTC when none), as `YYYY-MM-DD`; a day alone is itself. */
export function dayKeyIn(value: string | Date, zone?: string): string | null {
  if (typeof value === 'string' && DAY.test(value)) return value;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: usable(zone) })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * A day as Build writes it, "3 Dec" (or "3 Dec 2026" with `year`): the day a moment falls on in the zone, or a day
 * alone as it is. Empty for a value that cannot be read.
 */
export function dayWordsIn(value: string, zone?: string, { year = false }: { year?: boolean } = {}): string {
  const key = dayKeyIn(value, zone);
  if (!key) return '';
  const date = new Date(`${key}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(year && { year: 'numeric' }),
    timeZone: 'UTC',
  }).format(date);
}

/** "09:14": the time of a moment in the zone. Empty for a moment that cannot be read. */
export function timeWordsIn(at: string, zone?: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: usable(zone),
  }).format(date);
}

/** Whole days from one local day to another (`YYYY-MM-DD`); null when either cannot be read. */
export function daysFromTo(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Number.isNaN(start) || Number.isNaN(end) ? null : Math.round((end - start) / 86_400_000);
}
