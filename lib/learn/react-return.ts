/**
 * The way back from the sign-in a reaction started: the result page's address carries the pick (`?react=`), which is
 * stored once and then leaves the address. The address changes only after the store has answered, and through the
 * browser's history alone: a router navigation while the store is on its way cancels it.
 */

type Place = {
  readonly location: Pick<Location, 'pathname' | 'hash'>;
  readonly history: Pick<History, 'replaceState' | 'state'>;
};

/** Drops the query (the pick and the sign-in's state) from the address, with no navigation and the history's state kept. */
export function dropReturnQuery(place: Place): void {
  place.history.replaceState(place.history.state, '', `${place.location.pathname}${place.location.hash}`);
}

/** Stores the returned pick, then cleans the address, whether the store went through or not. */
export async function storeThenClean(store: () => Promise<unknown>, clean: () => void): Promise<void> {
  try {
    await store();
  } finally {
    clean();
  }
}

/**
 * The pick back from the sign-in, on arrival: stored with the sign-in's token, else (the sign-in did not keep one)
 * asked for again; for the result's own person (`own`), neither, since their result takes no reaction. Either way the
 * address is cleaned after, never while the page is still mounting or the store is on its way.
 */
export function settleReturnedPick(
  { canReact, own = false }: { canReact: boolean; own?: boolean },
  { store, prompt, clean }: { store: () => Promise<unknown>; prompt: () => void; clean: () => void },
): Promise<void> {
  if (own) return storeThenClean(async () => undefined, clean);
  return storeThenClean(canReact ? store : async () => prompt(), clean);
}
