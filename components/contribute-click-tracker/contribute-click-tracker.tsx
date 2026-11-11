'use client';

import { useEffect } from 'react';

import {
  CLICK_REPORT_PATH,
  type ClickReport,
  CONTRIBUTE_SOURCE_ATTR,
  type ConnectWay,
  clickOf,
  type Entry,
  entryOf,
  isLanding,
  lastClickOf,
} from '@/lib/contribute/click-tracking';

/** This tab's entry (campaign tags, referrer), kept for the tab so later clicks carry it. */
const ENTRY_KEY = 'contribute_entry_v1';
/** The last click into Contribute, kept in this browser so a later connect can name it. */
const LAST_CLICK_KEY = 'contribute_last_click_v1';

function send(report: ClickReport) {
  try {
    const body = JSON.stringify(report);
    if (typeof navigator.sendBeacon === 'function') {
      if (navigator.sendBeacon(CLICK_REPORT_PATH, new Blob([body], { type: 'application/json' }))) return;
    }
    void fetch(CLICK_REPORT_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Counting never gets in the way of the click.
  }
}

/** The tab's entry: read from storage, or worked out on its first page (`first`) and stored. */
function readEntry(): { entry: Entry; first: boolean } {
  try {
    const stored = window.sessionStorage.getItem(ENTRY_KEY);
    if (stored) return { entry: JSON.parse(stored) as Entry, first: false };
  } catch {
    // Storage is off: fall through, and count a landing only when it came from another site.
    const entry = entryOf(window.location.pathname, window.location.search, document.referrer, window.location.origin);
    return { entry, first: Boolean(entry.referrerHost) };
  }
  const entry = entryOf(window.location.pathname, window.location.search, document.referrer, window.location.origin);
  try {
    window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    // Storage is full or off: the entry is still good for this page.
  }
  return { entry, first: true };
}

const entryNow = (): Entry => {
  try {
    return JSON.parse(window.sessionStorage.getItem(ENTRY_KEY) ?? '{}') as Entry;
  } catch {
    return {};
  }
};

/**
 * Tells us a key or an agent was just connected, with the click into Contribute this browser remembers, so the count
 * of clicks can say how many led somewhere.
 */
export function reportContributeConnect(way: ConnectWay) {
  let source: string | undefined;
  try {
    source = lastClickOf(window.localStorage.getItem(LAST_CLICK_KEY), Date.now())?.source;
    window.localStorage.removeItem(LAST_CLICK_KEY);
  } catch {
    // Storage is off: a connect with no click on record.
  }
  send({ kind: 'connect', path: window.location.pathname, target: way, source, ...entryNow() });
}

/** Reports the connect once, when the screen that follows it is shown. */
export function ContributeConnected({ way }: { way: ConnectWay }) {
  useEffect(() => {
    reportContributeConnect(way);
  }, [way]);
  return null;
}

/**
 * Counts the steps into Contribute, from the browser, so pages served from a shared cache count too: a visit that
 * starts on one of Contribute's pages, and every click on a link or button marked with `contributeSource()` or on any
 * other link to Contribute. No cookie is set and nothing about the visitor is sent beyond the page, the mark, the
 * campaign tags of the address and the site the visit came from.
 */
export function ContributeClickTracker() {
  useEffect(() => {
    const { entry, first } = readEntry();
    if (first && isLanding(window.location.pathname)) {
      send({ kind: 'landing', path: window.location.pathname, ...entry });
    }

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const clicked = event.target.closest('a[href], button');
      if (!clicked) return;
      const click = clickOf({
        own: clicked.getAttribute(CONTRIBUTE_SOURCE_ATTR),
        around: clicked.closest(`[${CONTRIBUTE_SOURCE_ATTR}]`)?.getAttribute(CONTRIBUTE_SOURCE_ATTR),
        href: clicked.getAttribute('href'),
        pagePath: window.location.pathname,
        origin: window.location.origin,
      });
      if (!click) return;

      const path = window.location.pathname;
      send({ kind: 'click', path, ...click, ...entryNow() });
      try {
        window.localStorage.setItem(LAST_CLICK_KEY, JSON.stringify({ source: click.source, path, at: Date.now() }));
      } catch {
        // Storage is off: the click is counted, a later connect just cannot name it.
      }
    };

    // Capture: a handler that stops the event on its way up must not hide the click. `auxclick` is the middle button.
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, []);

  return null;
}
