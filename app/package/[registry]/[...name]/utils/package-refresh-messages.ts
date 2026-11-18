/**
 * Every word of a package's Refresh button that is its own: the lines under "Updates daily", the answers of "Refresh
 * now" and the note after a refresh. The words it shares with repositories are `pickCopyOf(true, 'package')`'s.
 */

/** The line under "Updates daily", before "Next update in {time}." */
export const PACKAGE_DAILY_NOTES = {
  byBadge: 'Updates daily: its repository has a GitRanks badge in its README.',
  /** Says only that it updates daily: who picked it is never shown. */
  byPick: 'Updates daily.',
} as const;

export const PACKAGE_REFRESH_LABELS = {
  /** Signed out: a press opens the deal. */
  refresh: 'Refresh',
  /** While a refresh runs. */
  refreshing: 'Refreshing…',
} as const;

export const PACKAGE_REFRESH_TOASTS = {
  started: 'Refreshing now.',
  queued: 'Refreshing in a few minutes.',
  upToDate: 'It was refreshed less than an hour ago.',
  used: 'Today’s refresh of a package is used. The next one is in {time}.',
  unknown: 'This package can’t be refreshed right now.',
  timedOut: 'The refresh is taking long. Come back later: the page updates when it is done.',
  /** The note after a refresh, once the page has reloaded. */
  refreshed: 'Updated: downloads, releases and the repositories that use it.',
  /** The same when the day's re-reads of repositories were spent. */
  refreshedPartly: 'Downloads and releases are updated. The repositories that use it are re-read tomorrow.',
} as const;

/** The main column of a package nobody has read yet. */
export const PACKAGE_NOT_READ = {
  title: 'We have not read this package yet',
  text: 'Press Refresh to read it: its downloads, its releases and the repositories with 100+ stars that use it. Then we update it every day for 7 days.',
} as const;
