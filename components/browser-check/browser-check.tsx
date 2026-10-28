/** Where the page notes when it last reloaded to pass the check, so a check the reload does not clear never loops. */
export const RELOADED_KEY = 'browser-check-reload';

/**
 * An image, avatar, script or stylesheet of this site can fail to load because the site asked this browser to
 * prove it is human: the check answers the asset's request, and an asset cannot show it. When a same-origin asset
 * fails, this asks once for the same URL; when the answer is the check, the page reloads, so the visitor sees the
 * check and passes it, and every asset loads after. One ask at a time, however many assets fail together; at most
 * one reload every two minutes, so a check the reload does not clear never loops; no storage, no reload.
 *
 * Plain JS run inline in the head: it listens from the first byte of the page, before any image or chunk loads and
 * whether or not the app's own scripts ever start.
 */
export const BROWSER_CHECK_SCRIPT = `(function () {
  var KEY = ${JSON.stringify(RELOADED_KEY)};
  var GAP = 120000;
  var asking = false;

  function reloadOnce() {
    try {
      var last = Number(sessionStorage.getItem(KEY));
      if (last && Date.now() - last < GAP) return;
      sessionStorage.setItem(KEY, String(Date.now()));
    } catch (e) {
      return;
    }
    location.reload();
  }

  function urlOf(element) {
    var raw = element.tagName === 'LINK' ? element.href : element.currentSrc || element.src;
    if (!raw) return null;
    try {
      var url = new URL(raw, location.href);
      return url.origin === location.origin ? url.href : null;
    } catch (e) {
      return null;
    }
  }

  window.addEventListener('error', function (event) {
    var target = event.target;
    if (asking || !target || !target.tagName) return;
    var url = urlOf(target);
    if (!url) return;
    asking = true;
    fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(
      function (response) {
        asking = false;
        if (response.headers.get('cf-mitigated') === 'challenge') reloadOnce();
      },
      function () {
        asking = false;
      }
    );
  }, true);
})();`;

/** Reloads the page when the site's browser check answers one of its assets; see `BROWSER_CHECK_SCRIPT`. */
export function BrowserCheck() {
  return <script dangerouslySetInnerHTML={{ __html: BROWSER_CHECK_SCRIPT }} />;
}
