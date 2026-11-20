'use client';

import { useEffect } from 'react';

/** Scrolls the page to the element the URL's `#section` names, when it is on the page. */
export function scrollToHash(): void {
  // The section ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
  const id = window.location.hash.slice(1);
  if (id) document.getElementById(id)?.scrollIntoView();
}

/**
 * Scrolls to the URL's `#section` once the screen that holds it is on the page. A screen streamed in behind Suspense
 * arrives after the browser's (or the router's) jump to the anchor, which then finds nothing and stays at the top.
 */
export function ScrollToHash() {
  useEffect(scrollToHash, []);
  return null;
}
