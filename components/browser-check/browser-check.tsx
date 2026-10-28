/** Where the page notes its last reload to pass the check (`<time>:<count>`), so reloads that do not clear it slow down. */
export const RELOADED_KEY = 'browser-check-reload';

/**
 * An image, avatar, script or stylesheet of this site can fail to load because the site asked this browser to
 * prove it is human: the check answers the asset's request, and an asset cannot show it. When a same-origin asset
 * fails, this asks for the same URL; when the answer is the check, the page reloads, so the visitor sees the check
 * and passes it, and every asset loads after. One ask at a time, however many assets fail together; a failure that
 * comes during an ask is asked about next, unless that ask found the check.
 *
 * The first reload is at once; each next one waits twice as long as the one before (2, 4, 8, … minutes), so a check
 * a reload does not clear never loops, and the count starts over after half an hour without one. No storage, no
 * reload.
 *
 * Plain JS run inline in the head, so it runs whether or not the app's own scripts ever start. React puts the page's
 * stylesheets, preloads and async chunks ahead of it, and they may fail before it listens: at start it also asks
 * about a stylesheet that did not load and a same-origin resource answered with 403.
 */
export const BROWSER_CHECK_SCRIPT = `(function () {
  var KEY = ${JSON.stringify(RELOADED_KEY)};
  var GAP = 120000;
  var FRESH = 1800000;
  var asking = false;
  var next = null;

  function reloadOnce() {
    try {
      var saved = String(sessionStorage.getItem(KEY) || '').split(':');
      var at = Number(saved[0]) || 0;
      var count = Number(saved[1]) || 0;
      var now = Date.now();
      if (now - at > FRESH) count = 0;
      if (count > 0 && now - at < GAP * Math.pow(2, count - 1)) return;
      sessionStorage.setItem(KEY, now + ':' + (count + 1));
    } catch (e) {
      return;
    }
    location.reload();
  }

  function sameOrigin(raw) {
    if (!raw) return null;
    try {
      var url = new URL(raw, location.href);
      return url.origin === location.origin ? url.href : null;
    } catch (e) {
      return null;
    }
  }

  function ask(url) {
    if (asking) {
      next = url;
      return;
    }
    asking = true;
    next = null;
    fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(
      function (response) {
        asking = false;
        if (response.headers.get('cf-mitigated') === 'challenge') return reloadOnce();
        if (next && next !== url) ask(next);
      },
      function () {
        asking = false;
      }
    );
  }

  window.addEventListener('error', function (event) {
    var target = event.target;
    if (!target || !target.tagName) return;
    var url = sameOrigin(target.tagName === 'LINK' ? target.href : target.currentSrc || target.src);
    if (url) ask(url);
  }, true);

  try {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = 0; i < links.length; i++) {
      var href = sameOrigin(links[i].href);
      if (href && !links[i].sheet) return ask(href);
    }
    var entries = performance.getEntriesByType('resource');
    for (var j = 0; j < entries.length; j++) {
      var name = sameOrigin(entries[j].name);
      if (name && entries[j].responseStatus === 403) return ask(name);
    }
  } catch (e) {}
})();`;

/** Reloads the page when the site's browser check answers one of its assets; see `BROWSER_CHECK_SCRIPT`. */
export function BrowserCheck() {
  return <script dangerouslySetInnerHTML={{ __html: BROWSER_CHECK_SCRIPT }} />;
}
