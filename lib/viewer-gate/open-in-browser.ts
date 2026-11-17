type Login = string | null | undefined;

/** One page's "is it open to this viewer" question, asked from the browser. */
export type OpenInBrowser = {
  /**
   * Whether it is open to this viewer, asked once per login per page load; closed without a login and on any failure.
   */
  ask: (login: Login) => Promise<boolean>;
  /** The answer for this login once the browser has it; undefined before (and always on the server). */
  known: (login: Login) => boolean | undefined;
  /** Forgets the answers (tests). */
  reset: () => void;
};

const gates = new Map<string, OpenInBrowser>();

/**
 * The question behind `path`, a route that answers `{ open: boolean }` for the signed-in viewer. Pages are cached for
 * everyone, so what only some viewers may see is asked in the browser once the page is up. Each path keeps its own
 * answers; asking for the same path again returns the same ones.
 */
export function openInBrowserOf(path: string): OpenInBrowser {
  let gate = gates.get(path);
  if (!gate) {
    const asked = new Map<string, Promise<boolean>>();
    const known = new Map<string, boolean>();
    gate = {
      ask(login) {
        if (!login) return Promise.resolve(false);
        let answer = asked.get(login);
        if (!answer) {
          answer = fetch(path)
            .then(async (res) => (res.ok ? ((await res.json()) as { open?: unknown }).open === true : false))
            .catch(() => false)
            .then((open) => {
              known.set(login, open);
              return open;
            });
          asked.set(login, answer);
        }
        return answer;
      },
      known: (login) => (login ? known.get(login) : undefined),
      reset() {
        asked.clear();
        known.clear();
      },
    };
    gates.set(path, gate);
  }
  return gate;
}
