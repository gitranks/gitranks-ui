/**
 * The announcement bar above the header: GitRanks Contribute's launch. It is in every page's HTML, the same for
 * everyone, so cached pages stay shared; whether this browser still shows it is decided in the browser.
 */

/** The bar's words. */
export const LAUNCH_BAR_LEAD = 'Turn unused AI tokens into PRs';
export const LAUNCH_BAR_TAIL =
  'We pick issues that fit your stack, your agent fixes them, you approve, the PR opens in your name.';
export const LAUNCH_BAR_CUE = 'See how it works';

/**
 * Where this browser notes that it is done with this announcement: the X was pressed, or a Contribute page was
 * opened. Named after the announcement, so the next one shows again.
 */
export const LAUNCH_BAR_KEY = 'launch-bar-contribute-2026-11';

/** The attribute on `<html>` that hides the bar (see `globals.css`). */
export const LAUNCH_BAR_ATTR = 'data-launch-bar';
export const LAUNCH_BAR_OFF = 'off';

/** Hides the bar from now on in this browser. `reason`: what ended it. */
export function hideLaunchBar(reason: 'dismissed' | 'seen') {
  document.documentElement.setAttribute(LAUNCH_BAR_ATTR, LAUNCH_BAR_OFF);
  try {
    if (!window.localStorage.getItem(LAUNCH_BAR_KEY)) window.localStorage.setItem(LAUNCH_BAR_KEY, reason);
  } catch {
    // Storage is off: hidden until the next full page load.
  }
}

/**
 * Plain JS run inline in the head, before the body paints: hides the bar on Contribute's own pages and in a browser
 * done with it, so it never flashes there. Later moves are the app's (`hideLaunchBar`).
 */
export const LAUNCH_BAR_SCRIPT = `(function () {
  var off = /^\\/+contribute(?:[\\/\\\\]|$)/i.test(location.pathname);
  if (!off) {
    try {
      off = Boolean(localStorage.getItem(${JSON.stringify(LAUNCH_BAR_KEY)}));
    } catch (e) {}
  }
  if (off) document.documentElement.setAttribute(${JSON.stringify(LAUNCH_BAR_ATTR)}, ${JSON.stringify(LAUNCH_BAR_OFF)});
})();`;
