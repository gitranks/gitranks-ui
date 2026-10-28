/** Where the page notes when it last reloaded to pass the check, so a check the reload does not clear never loops. */
export const RELOADED_KEY = 'badge-builder:browser-check-reload';

/** A second reload within this gap would not help: the first one did not clear the check. */
const RELOAD_GAP = 2 * 60_000;

type BrowserCheckOptions = {
  ask?: (src: string) => Promise<Response>;
  reload?: () => void;
  storage?: () => Pick<Storage, 'getItem' | 'setItem'>;
  now?: () => number;
};

export type BrowserCheck = {
  /** An image failed: asks once why, and reloads the page when the browser check answered instead of the badge. */
  onImageError: (src: string) => void;
};

/**
 * A badge preview can fail to load because the site asked this browser to prove it is human: the check answers the
 * image request, and an `<img>` cannot show it. A reload of the page shows it, and passing it clears every image.
 * One ask at a time, however many previews fail together, and at most one reload per `RELOAD_GAP`.
 */
export function createBrowserCheck({
  ask = (src) => fetch(src, { cache: 'no-store' }),
  reload = () => window.location.reload(),
  storage = () => window.sessionStorage,
  now = Date.now,
}: BrowserCheckOptions = {}): BrowserCheck {
  let asking = false;

  const reloadOnce = () => {
    try {
      const store = storage();
      const last = Number(store.getItem(RELOADED_KEY));
      if (last && now() - last < RELOAD_GAP) return;
      store.setItem(RELOADED_KEY, String(now()));
    } catch {
      return; // no storage: no way to tell a first reload from a loop
    }
    reload();
  };

  return {
    onImageError: (src) => {
      if (asking) return;
      asking = true;
      ask(src).then(
        (response) => {
          asking = false;
          if (response.headers.get('cf-mitigated') === 'challenge') reloadOnce();
        },
        () => {
          asking = false;
        },
      );
    },
  };
}

let shared: BrowserCheck | undefined;

/** The page's one check, shared by every preview on it. */
export function browserCheck(): BrowserCheck {
  shared ??= createBrowserCheck();
  return shared;
}
