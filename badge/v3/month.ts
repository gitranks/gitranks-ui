/**
 * Month keys as the API writes them: the 1st of a month, `YYYY-MM-01`, in UTC (`monthStarts` of a repository, a
 * profile's `snapshots` and a rank's `snapshots` all use them).
 */
export const monthKey = (year: number, monthIndex: number) => {
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

/** This month's key and last month's, and last month's short English name ("Sep"). */
export function monthKeysOf(now: Date) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    thisKey: monthKey(year, month),
    lastKey: monthKey(year, month - 1),
    lastName: shortMonthName(month - 1),
    dayOfMonth: now.getUTCDate(),
  };
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep" for a month index; wraps around the year. */
export const shortMonthName = (monthIndex: number) => SHORT_MONTHS[((monthIndex % 12) + 12) % 12];

/** "Sep" for "2026-09" or "2026-09-01"; `null` for anything else. */
export function shortNameOfMonth(month: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(month ?? '');
  if (!match) {
    return null;
  }
  const index = Number(match[2]) - 1;
  return index >= 0 && index < 12 ? SHORT_MONTHS[index] : null;
}

/** "Sep 2026" for a month key, for chart axes. */
export function monthLabelOf(key: string): string {
  const name = shortNameOfMonth(key);
  return name ? `${name} ${key.slice(0, 4)}` : key;
}
