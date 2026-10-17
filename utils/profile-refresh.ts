/** GitHub logins, including the legacy ones that start or end with a hyphen. */
const GITHUB_LOGIN = /^[A-Za-z0-9-]{1,39}$/;

/**
 * How long after a profile's fetch status last changed its cached pages may be expired. A fetch the
 * Refresh button waits on longer than 10 minutes is given up, so this leaves room for its last check.
 */
export const PROFILE_REFRESH_WINDOW = 15 * 60 * 1_000;

type FetchingState = { fetchingStatus?: string | null; fetchingUpdatedAt?: number | null };

export const isGithubLogin = (value: unknown): value is string => typeof value === 'string' && GITHUB_LOGIN.test(value);

export const profileCacheTag = (login: string) => `profile:${login}`;

/**
 * The profile's fetch status as one key, or null when the status did not change within
 * `PROFILE_REFRESH_WINDOW`: then no refresh started or finished lately, and nothing in the cache is stale.
 */
export function recentRefreshState(user: FetchingState | null | undefined, now: number): string | null {
  if (!user?.fetchingStatus || typeof user.fetchingUpdatedAt !== 'number') {
    return null;
  }

  if (now - user.fetchingUpdatedAt > PROFILE_REFRESH_WINDOW) {
    return null;
  }

  return `${user.fetchingStatus}@${user.fetchingUpdatedAt}`;
}

/**
 * The fetch status each profile's cache was last expired at. Expiring it again at the same status
 * renders the same page, so every status is expired once. Only the most recent `limit` profiles are kept.
 */
export class ExpiredRefreshStates {
  private readonly states = new Map<string, string>();

  constructor(private readonly limit = 1_000) {}

  /** True when the cache of `login` was not yet expired at `state`; from then on it counts as expired. */
  claim(login: string, state: string): boolean {
    if (this.states.get(login) === state) {
      return false;
    }

    this.states.delete(login);
    this.states.set(login, state);

    if (this.states.size > this.limit) {
      const [oldest] = this.states.keys();
      this.states.delete(oldest);
    }

    return true;
  }
}
