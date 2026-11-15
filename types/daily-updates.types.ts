/**
 * The signed-in visitor's daily updates, as the API answers them; dates arrive as ISO strings. Who else picked a
 * repository is never in any of them.
 */

/** `never`: not started; `on`: the 7 days run; `lapsed`: started before, and the 7 days ran out. */
export type DailyUpdatesState = 'never' | 'on' | 'lapsed';

/** One of the visitor's picks: a repository updated every day while their daily updates are on. */
export type DailyUpdatesPick = { nameWithOwner: string; pickedAt: string };

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

/** A pick of a repository. */
export type DailyUpdatesPickResult =
  | { status: 'picked'; picks: DailyUpdatesPick[]; newPicksLeftToday: number }
  | { status: 'full' }
  | { status: 'daily_limit'; nextAt: string }
  | { status: 'not_held' }
  | DailyUpdatesStarRefusal;

/** A pick's removal. */
export type DailyUpdatesRemoveResult = { status: 'removed'; picks: DailyUpdatesPick[] };
