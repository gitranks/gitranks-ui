import { openInBrowserOf } from '@/lib/viewer-gate/open-in-browser';

/** Where the browser asks whether Learn is open to the signed-in viewer. */
export const LEARN_OPEN_PATH = '/api/me/learn/open';

const learnOpen = openInBrowserOf(LEARN_OPEN_PATH);

/** The answer for this login once the browser has it; undefined before (and always on the server). */
export const learnOpenKnown = (login: string | null | undefined): boolean | undefined => learnOpen.known(login);

/**
 * Whether Learn is open to this viewer, asked once per login per page load (the menu is on every page); closed
 * without a login and on any failure.
 */
export function learnOpenInBrowser(login: string | null | undefined): Promise<boolean> {
  return learnOpen.ask(login);
}

/** Forgets the answers (tests). */
export const resetLearnOpenInBrowser = () => learnOpen.reset();
