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
  firstEntryOf,
  isLanding,
  lastClickOf,
  namesChannel,
} from '@/lib/contribute/click-tracking';

/** This tab's entry (campaign tags, referrer), kept for the tab so later clicks carry it. */
const ENTRY_KEY = 'contribute_entry_v1';
/** The last click into Contribute, kept in this browser so a later connect can name it. */
const LAST_CLICK_KEY = 'contribute_last_click_v1';
/** The first visit that came from a channel (tags or another site), kept so a later connect can name it. */
const FIRST_ENTRY_KEY = 'contribute_first_entry_v1';

/**
 * Keeps the entry as the browser's first one, unless a recent one is on record already. A tagged visit (a campaign, or
 * Product Hunt's `ref`) takes the place of one that only had another site: most visits come from GitHub, and a launch
 * post would otherwise never get the credit for a visitor who had once followed a README link.
 */
function keepFirstEntry(entry: Entry) {
  if (!namesChannel(entry)) return;
  const tagged = (value: Entry) => Boolean(value.utmSource || value.utmCampaign);
  try {
    const stored = firstEntryOf(window.localStorage.getItem(FIRST_ENTRY_KEY), Date.now());
    if (stored && (tagged(stored) || !tagged(entry))) return;
    window.localStorage.setItem(FIRST_ENTRY_KEY, JSON.stringify({ entry, at: Date.now() }));
  } catch {
    // Storage is off: a connect is read by the tab's own entry.
  }
}

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

/**
 * The tab's entry: read from storage, or worked out on its first page and stored. `landing`: this page began a visit,
 * not a tab opened from one of our own pages (its referrer is ours) and not a page shown with storage off, where a
 * return from sign-in would look like a new visit (only a tagged address counts then).
 */
function readEntry(): { entry: Entry; landing: boolean } {
  const fresh = () =>
    entryOf(window.location.pathname, window.location.search, document.referrer, window.location.origin);
  const fromUs = () => {
    try {
      return Boolean(document.referrer) && new URL(document.referrer).origin === window.location.origin;
    } catch {
      return false;
    }
  };
  try {
    const stored = window.sessionStorage.getItem(ENTRY_KEY);
    if (stored) return { entry: JSON.parse(stored) as Entry, landing: false };
  } catch {
    const entry = fresh();
    return { entry, landing: Boolean(entry.utmSource || entry.utmCampaign) };
  }
  const entry = fresh();
  try {
    window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    // Storage is full: the entry is still good for this page.
  }
  keepFirstEntry(entry);
  return { entry, landing: !fromUs() };
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
  let first: Entry | null = null;
  try {
    source = lastClickOf(window.localStorage.getItem(LAST_CLICK_KEY), Date.now())?.source;
    first = firstEntryOf(window.localStorage.getItem(FIRST_ENTRY_KEY), Date.now());
    window.localStorage.removeItem(LAST_CLICK_KEY);
    window.localStorage.removeItem(FIRST_ENTRY_KEY);
  } catch {
    // Storage is off: a connect with no click or first visit on record.
  }
  // The channel of the first visit that named one, else this tab's.
  send({ kind: 'connect', path: window.location.pathname, target: way, source, ...(first ?? entryNow()) });
}

/**
 * Counts the steps into Contribute, from the browser, so pages served from a shared cache count too: a visit that
 * starts on one of Contribute's pages, and every click on a link or button marked with `contributeSource()` or on any
 * other link to Contribute. No cookie is set and nothing about the visitor is sent beyond the page, the mark, the
 * campaign tags of the address and the site the visit came from.
 */
export function ContributeClickTracker() {
  useEffect(() => {
    const { entry, landing } = readEntry();
    // Not a page that answered 404: a closed page of Contribute keeps its address.
    if (landing && isLanding(window.location.pathname) && !document.querySelector('[data-not-found]')) {
      send({ kind: 'landing', path: window.location.pathname, ...entry });
    }

    const onClick = (event: MouseEvent) => {
      // `auxclick` is also the right button (a menu, to copy the link): only the middle one opens it.
      if (event.type === 'auxclick' && event.button !== 1) return;
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
