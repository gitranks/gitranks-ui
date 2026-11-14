/**
 * The way back from the sign-in a reaction started: the result page's address carries the pick (`?react=`), which is
 * stored once and then leaves the address. The address changes only after the store has answered, and through the
 * browser's history alone: a router navigation while the store is on its way cancels it.
 */

type Place = {
  readonly location: Pick<Location, 'pathname' | 'hash'>;
  readonly history: Pick<History, 'replaceState'>;
};

/** Drops the query (the pick and the sign-in's state) from the address, with no navigation. */
export function dropReturnQuery(place: Place): void {
  place.history.replaceState(null, '', `${place.location.pathname}${place.location.hash}`);
}

/** Stores the returned pick, then cleans the address, whether the store went through or not. */
export async function storeThenClean(store: () => Promise<unknown>, clean: () => void): Promise<void> {
  try {
    await store();
  } finally {
    clean();
  }
}
