'use client';

import { useEffect } from 'react';

/**
 * Scrolls to the URL's `#section` once the screen that holds it is on the page. A screen streamed in behind Suspense
 * arrives after the browser's (or the router's) jump to the anchor, which then finds nothing and stays at the top.
 */
export function ScrollToHash() {
  useEffect(() => {
    // The section ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return null;
}
