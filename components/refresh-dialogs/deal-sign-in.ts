/**
 * A sign-in started from the deal leaves a mark in the tab's session storage, so the page it returns to can take the
 * next step by itself: check the star and start, or ask for it. One mark, for the page it was started on. Storage can
 * be missing or refuse access (private modes, blocked site data): then there is no mark, and the visitor presses again.
 */

type StorageOf = () => Storage;

const sessionStorageOf: StorageOf = () => window.sessionStorage;

const KEY = 'daily-updates-deal';

/** How long a mark waits for the sign-in to come back; an older one is from an earlier visit and is dropped. */
export const DEAL_SIGN_IN_TTL = 15 * 60_000;

/** The page a mark names: `profile:octo-dev`, `repo:acme/fastqueue` or `package:npm/left-pad`, in any letter case. */
export const dealPageOf = (kind: 'profile' | 'repo' | 'package', name: string) => `${kind}:${name}`.toLowerCase();

/** Marks a sign-in from the deal on this page, just before it starts. */
export function keepDealSignIn(page: string, storage: StorageOf = sessionStorageOf, at?: number) {
  const now = at ?? Date.now();
  try {
    storage().setItem(KEY, JSON.stringify({ page, at: now }));
  } catch {
    // No storage, no mark.
  }
}

const parse = (raw: string): { page?: unknown; at?: unknown } => {
  try {
    const mark: unknown = JSON.parse(raw);
    return mark && typeof mark === 'object' ? mark : {};
  } catch {
    return {};
  }
};

/**
 * Whether the sign-in this page came back from started at the deal on this page, once: a mark for this page is
 * removed when read, and an old or broken one is dropped. A fresh mark of another page stays for that page.
 */
export function takeDealSignIn(page: string, storage: StorageOf = sessionStorageOf, at?: number): boolean {
  const now = at ?? Date.now();
  try {
    const store = storage();
    const raw = store.getItem(KEY);
    if (raw === null) {
      return false;
    }

    const mark = parse(raw);
    const age = typeof mark.at === 'number' ? now - mark.at : Number.NaN;
    const fresh = age >= 0 && age <= DEAL_SIGN_IN_TTL;
    if (fresh && mark.page !== page) {
      return false;
    }

    store.removeItem(KEY);
    return fresh;
  } catch {
    return false;
  }
}
