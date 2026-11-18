/**
 * A press of "Refresh now" on a package that updates every day; dates arrive as ISO strings. `started` and `queued`
 * (the next round of updates refreshes it) say when the visitor's next refresh of a package opens; `running`: one is
 * under way; `up_to_date`: it was refreshed within the hour; `used`: today's refresh of a package is used;
 * `not_starred`, `blocked`, `busy`: the star check; `unknown`: no such package, or one not on daily updates.
 */
export type PackageRefreshResult =
  | { status: 'started'; nextAt: string }
  | { status: 'queued'; nextAt: string }
  | { status: 'running' }
  | { status: 'up_to_date' }
  | { status: 'used'; nextAt: string }
  | { status: 'not_starred' }
  | { status: 'blocked'; until: string }
  | { status: 'busy' }
  | { status: 'unknown' };

/**
 * A package's refresh as its row has it: one under way, when it last landed, and whether that one re-read the
 * repositories that use it (`false`: downloads and releases only; the rest the next day).
 */
export type PackageRefreshStatus = { running: boolean; lastUpdatedAt: string | null; dependentsChecked: boolean };
