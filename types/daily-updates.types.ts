/**
 * The signed-in visitor's daily updates, as the API answers them; dates arrive as ISO strings. Who else picked a
 * repository is never in any of them.
 */

/** `never`: not started; `on`: the 7 days run; `lapsed`: started before, and the 7 days ran out. */
export type DailyUpdatesState = 'never' | 'on' | 'lapsed';

/** What a pick names: `repo`, a repository by `owner/name`; `package`, a package by `<registry>/<name>`. */
export type PickKind = 'repo' | 'package';

/**
 * A pick as the site names it: its kind and its name (a repository's `owner/name`, a package's `<registry>/<name>`).
 */
export type PickRef = { kind: PickKind; name: string };

/** One of the visitor's picks: updated every day while their daily updates are on. */
export type DailyUpdatesPick = PickRef & { pickedAt: string };

/** The visitor's state. With `open: false` the site shows today's buttons and asks nothing else. */
export type DailyUpdatesViewer = {
  open: boolean;
  state: DailyUpdatesState;
  until: string | null;
  /** Today's manual refresh of their own profile; `nextAt` while it is used. */
  manual: { available: boolean; nextAt: string | null };
  picks: DailyUpdatesPick[];
  newPicksLeftToday: number;
};

/** Why a star check gave no star. */
export type DailyUpdatesStarRefusal =
  | { status: 'not_starred' }
  | { status: 'blocked'; until: string }
  | { status: 'busy' };

/** A press of "Start daily updates"; `refreshed` says whether the profile is fetched now. */
export type DailyUpdatesStartResult =
  | { status: 'started'; until: string; refreshed: boolean; nextAt: string }
  | { status: 'fetching' }
  | { status: 'not_own' }
  | DailyUpdatesStarRefusal;

/** A signed-in visit; `retry` asks for the visit again at a later page. */
export type DailyUpdatesVisitResult = {
  state: DailyUpdatesState;
  until: string | null;
  restarted: boolean;
  retry: boolean;
};

/**
 * What a new pick of a package started: a refresh now (`started`), one already under way (`running`), none since it was
 * refreshed within the hour (`fresh`), or one at the next round of updates (`due`).
 */
export type PickRefreshStatus = 'started' | 'running' | 'fresh' | 'due';

/** A pick of a repository or a package; a package's says what its refresh did. */
export type DailyUpdatesPickResult =
  | { status: 'picked'; picks: DailyUpdatesPick[]; newPicksLeftToday: number; refresh?: PickRefreshStatus }
  | { status: 'full' }
  | { status: 'daily_limit'; nextAt: string }
  | { status: 'not_held' }
  | DailyUpdatesStarRefusal;

/** A pick's removal. */
export type DailyUpdatesRemoveResult = { status: 'removed'; picks: DailyUpdatesPick[] };

/**
 * What "Check my badge" checks: a profile by login, a repository by `owner/name`, or a package by `<registry>/<name>`.
 */
export type BadgeCheckKind = 'user' | 'repo' | 'package';

/**
 * "Check my badge": the README was read now. `found`: a badge is there, and daily updates are on until `until`;
 * `not_found`: no badge, `checksLeft` today for this profile, repository or package; `no_repository`: the package names
 * no repository, so there is no README to read; `limit`: no check until `nextAt`; `unknown`: GitRanks has no such
 * profile, repository or package; `unavailable`: the README could not be read now.
 */
export type BadgeCheckResult =
  | { status: 'found'; until: string }
  | { status: 'not_found'; checksLeft: number }
  | { status: 'no_repository' }
  | { status: 'limit'; nextAt: string }
  | { status: 'unknown' }
  | { status: 'unavailable' };
