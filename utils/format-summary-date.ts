const SUMMARY_DATE = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A monthly summary's `2026-10-01` as `October 1, 2026`; anything else as it came. */
export function formatSummaryDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : SUMMARY_DATE.format(parsed);
}
