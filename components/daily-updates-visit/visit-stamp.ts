/**
 * The day this browser last counted a signed-in visit, one per GitHub login, in local storage. Storage can be missing
 * or refuse access (private modes, blocked site data): then there is no stamp, and no error.
 */

type StorageOf = () => Storage;

const localStorageOf: StorageOf = () => window.localStorage;

const stampKey = (login: string) => `daily-updates-visit:${login.toLowerCase()}`;

/** The UTC day of a time, as `2026-11-15`. */
export const visitDayOf = (now: number) => new Date(now).toISOString().slice(0, 10);

/** Whether this browser counted the login's visit today already. */
export function visitedToday(login: string, at?: number, storage: StorageOf = localStorageOf): boolean {
  const now = at ?? Date.now();
  try {
    return storage().getItem(stampKey(login)) === visitDayOf(now);
  } catch {
    return false;
  }
}

/** Keeps today as the day the login's visit was counted. */
export function stampVisit(login: string, at?: number, storage: StorageOf = localStorageOf) {
  const now = at ?? Date.now();
  try {
    storage().setItem(stampKey(login), visitDayOf(now));
  } catch {
    // No storage, no stamp.
  }
}
