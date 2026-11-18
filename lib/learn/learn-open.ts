import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

/** Where the browser asks whether Learn is open to the signed-in viewer. */
export const LEARN_OPEN_PATH = '/api/me/learn/open';
/** Where a visitor's browser asks whether Learn is open to everyone: the same answer for all, kept by shared caches. */
export const LEARN_EVERYONE_PATH = '/api/learn/everyone';

const learnOpen = openInBrowserOf(LEARN_OPEN_PATH);

let visitors: Promise<boolean> | null = null;
let visitorsKnown: boolean | undefined;

/** The answer for this login once the browser has it; undefined before (and always on the server). */
export const learnOpenKnown = (login: string | null | undefined): boolean | undefined => learnOpen.known(login);

/**
 * Whether Learn is open to this viewer, asked once per login per page load (the menu is on every page); closed
 * without a login and on any failure.
 */
export function learnOpenInBrowser(login: string | null | undefined): Promise<boolean> {
  return learnOpen.ask(login);
}

/**
 * Whether Learn is open to a visitor without a session (it is open to everyone), asked once per page load; closed on
 * any failure.
 */
export function learnOpenToVisitorsInBrowser(): Promise<boolean> {
  visitors ??= fetch(LEARN_EVERYONE_PATH)
    .then(async (res) => (res.ok ? ((await res.json()) as { open?: unknown }).open === true : false))
    .catch(() => false)
    .then((open) => {
      visitorsKnown = open;
      return open;
    });
  return visitors;
}

/** The visitors' answer once the browser has it; undefined before (and always on the server). */
export const learnOpenToVisitorsKnown = (): boolean | undefined => visitorsKnown;

/** Forgets the answers (tests). */
export const resetLearnOpenInBrowser = () => {
  learnOpen.reset();
  visitors = null;
  visitorsKnown = undefined;
};
