/** The signed-in user's refresh of the day on our token; `nextAt` is set while it is spent. */
export type DailyRefreshStatus = { available: boolean; nextAt: string | null };

/** The verdict of one press of the button; dates arrive as ISO strings. */
export type DailyRefreshResult =
  | { status: 'started'; nextAt: string }
  | { status: 'fetching' }
  | { status: 'not_starred' }
  | { status: 'blocked'; until: string }
  | { status: 'used'; nextAt: string }
  | { status: 'busy' }
  | { status: 'not_own' };
