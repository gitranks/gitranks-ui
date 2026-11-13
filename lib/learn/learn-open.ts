/** Where the browser asks whether Learn is open to the signed-in viewer. */
export const LEARN_OPEN_PATH = '/api/me/learn/open';

const asked = new Map<string, Promise<boolean>>();
const known = new Map<string, boolean>();

/** The answer for this login once the browser has it; undefined before (and always on the server). */
export const learnOpenKnown = (login: string | null | undefined): boolean | undefined =>
  login ? known.get(login) : undefined;

/**
 * Whether Learn is open to this viewer, asked once per login per page load (the menu is on every page); closed
 * without a login and on any failure.
 */
export function learnOpenInBrowser(login: string | null | undefined): Promise<boolean> {
  if (!login) return Promise.resolve(false);
  let answer = asked.get(login);
  if (!answer) {
    answer = fetch(LEARN_OPEN_PATH)
      .then(async (res) => (res.ok ? ((await res.json()) as { open?: unknown }).open === true : false))
      .catch(() => false)
      .then((open) => {
        known.set(login, open);
        return open;
      });
    asked.set(login, answer);
  }
  return answer;
}

/** Forgets the answers (tests). */
export const resetLearnOpenInBrowser = () => {
  asked.clear();
  known.clear();
};
