/**
 * The announcement bar above the header. It is in every page's HTML, the same for everyone, so cached pages stay
 * shared; which bar this browser shows, if any, is decided in the browser.
 *
 * Three bars, one at a time, by the clock: Product Hunt's "launching soon" until the launch, its "we're live" for the
 * launch week, then Contribute's own bar again.
 */

/** The bars, in the order they run. */
export type LaunchBarId = 'ph-soon' | 'ph-live' | 'contribute';

/** Wed Nov 18 2026, 08:01 UTC (00:01 in San Francisco): GitRanks Contribute goes live on Product Hunt. */
export const PRODUCT_HUNT_LIVE_AT = Date.UTC(2026, 10, 18, 8, 1);

/** A week later, Contribute's own bar comes back. */
export const PRODUCT_HUNT_END_AT = Date.UTC(2026, 10, 25, 8, 1);

/** The bar to show at `now` (ms). */
export function launchBarAt(now: number): LaunchBarId {
  if (now < PRODUCT_HUNT_LIVE_AT) return 'ph-soon';
  if (now < PRODUCT_HUNT_END_AT) return 'ph-live';
  return 'contribute';
}

/** Contribute's bar: its words. */
export const LAUNCH_BAR_LEAD = 'Turn unused AI tokens into PRs';
export const LAUNCH_BAR_TAIL =
  'We pick issues that fit your stack, your agent fixes them, you approve, the PR opens in your name.';
export const LAUNCH_BAR_CUE = 'See how it works';

/** GitRanks on Product Hunt: the upcoming launch, then the launch itself. */
export const PRODUCT_HUNT_URL = 'https://www.producthunt.com/products/gitranks';

/** The Product Hunt bars' words. `chipShort` is the chip on phones. None of them asks for a vote (Product Hunt's rules). */
export const PRODUCT_HUNT_BARS = {
  'ph-soon': {
    lead: 'Launching on Product Hunt',
    chip: 'Wed, Nov 18',
    chipShort: 'Nov 18',
    tail: 'GitRanks Contribute: your AI agent fixes open-source issues, you approve every PR.',
    cue: 'Get a first look',
    href: PRODUCT_HUNT_URL,
  },
  'ph-live': {
    lead: 'We’re live on Product Hunt',
    chip: 'Live',
    chipShort: 'Live',
    tail: 'Tell us what you think of GitRanks Contribute. The founder answers every comment.',
    cue: 'Watch the demo',
    href: PRODUCT_HUNT_URL,
  },
} as const;

/**
 * Where this browser notes that it is done with a bar: its X was pressed, or (Contribute's bar) a Contribute page was
 * opened. One key per bar, so closing one never hides another.
 */
export const LAUNCH_BAR_KEYS: Record<LaunchBarId, string> = {
  'ph-soon': 'launch-bar-producthunt-soon-2026-11',
  'ph-live': 'launch-bar-producthunt-live-2026-11',
  contribute: 'launch-bar-contribute-2026-11',
};

/**
 * The attribute on `<html>` that names the bar to show, or `off` for none (see `globals.css`). Each bar's root carries
 * `data-launch-bar-root` with its id; a bar shows only while the attribute names it.
 */
export const LAUNCH_BAR_ATTR = 'data-launch-bar';
export const LAUNCH_BAR_OFF = 'off';

/** Notes that this browser is done with `bar`, and hides it if it is the one showing. `reason`: what ended it. */
export function hideLaunchBar(bar: LaunchBarId, reason: 'dismissed' | 'seen') {
  const root = document.documentElement;
  if (root.getAttribute(LAUNCH_BAR_ATTR) === bar) root.setAttribute(LAUNCH_BAR_ATTR, LAUNCH_BAR_OFF);
  try {
    if (!window.localStorage.getItem(LAUNCH_BAR_KEYS[bar])) window.localStorage.setItem(LAUNCH_BAR_KEYS[bar], reason);
  } catch {
    // Storage is off: hidden until the next full page load.
  }
}

/**
 * Plain JS run inline in the head, before the body paints: picks the bar for this minute (as `launchBarAt` does) and
 * leaves it off in a browser done with it. Contribute's bar is also off on Contribute's own pages, decided as
 * `isContributePath` does (the spec holds them together); the Product Hunt bars show there too. Later moves are the
 * app's (`hideLaunchBar`).
 */
export const LAUNCH_BAR_SCRIPT = `(function () {
  var now = Date.now();
  var bar = now < ${PRODUCT_HUNT_LIVE_AT} ? 'ph-soon' : now < ${PRODUCT_HUNT_END_AT} ? 'ph-live' : 'contribute';
  var keys = ${JSON.stringify(LAUNCH_BAR_KEYS)};
  var off = false;
  if (bar === 'contribute') {
    var path = location.pathname;
    try {
      path = decodeURIComponent(path);
    } catch (e) {}
    off = /^\\/+contribute(?:[\\/\\\\]|$)/i.test(path);
  }
  if (!off) {
    try {
      off = Boolean(localStorage.getItem(keys[bar]));
    } catch (e) {}
  }
  document.documentElement.setAttribute(${JSON.stringify(LAUNCH_BAR_ATTR)}, off ? ${JSON.stringify(LAUNCH_BAR_OFF)} : bar);
})();`;
