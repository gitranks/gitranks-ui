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
 * A status expired this long ago may be expired again. A page render that started before the expiry can
 * still be stored after it, holding the old status; the Refresh button checks every 20 s and reloads, so
 * a call within its next two checks replaces that page.
 */
export const REPEAT_EXPIRY_AFTER = 15 * 1_000;

/**
 * Profile URLs match logins in any letter case, and each spelling has its own cache tag. The stored
 * spelling, which the site's own links use, is always expired; besides it, a status is expired for at
 * most this many spellings.
 */
export const MAX_SPELLINGS_PER_STATUS = 3;

type ExpiredStatus = { state: string; expiredAt: Map<string, number> };

/**
 * The fetch status each profile's cache was last expired at, and when, per spelling of the login.
 * Expiring it again at the same status renders the same page, so a status is expired once, and again
 * only after `REPEAT_EXPIRY_AFTER`. Only the most recent `limit` profiles are kept.
 */
export class ExpiredRefreshStates {
  private readonly profiles = new Map<string, ExpiredStatus>();

  constructor(private readonly limit = 1_000) {}

  /**
   * True when the cache of `login` is due to be expired at `state`; from then on it counts as expired.
   * `storedLogin` is the profile's login as stored, which `MAX_SPELLINGS_PER_STATUS` does not limit.
   */
  claim(login: string, state: string, now: number, storedLogin?: string | null): boolean {
    const key = login.toLowerCase();
    const known = this.profiles.get(key);
    const status = known?.state === state ? known : { state, expiredAt: new Map<string, number>() };
    const lastExpiredAt = status.expiredAt.get(login);

    if (lastExpiredAt !== undefined && now - lastExpiredAt < REPEAT_EXPIRY_AFTER) {
      return false;
    }

    if (lastExpiredAt === undefined && login !== storedLogin) {
      const otherSpellings = [...status.expiredAt.keys()].filter((spelling) => spelling !== storedLogin);

      if (otherSpellings.length >= MAX_SPELLINGS_PER_STATUS) {
        return false;
      }
    }

    status.expiredAt.set(login, now);
    this.profiles.delete(key);
    this.profiles.set(key, status);

    if (this.profiles.size > this.limit) {
      const [oldest] = this.profiles.keys();
      this.profiles.delete(oldest);
    }

    return true;
  }
}
