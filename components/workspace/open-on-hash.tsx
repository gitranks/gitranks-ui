'use client';

import { useEffect } from 'react';

/**
 * Opens the `<details>` with this id when the URL's `#hash` is the fold or an anchor inside it, on load and on each
 * hash change, then scrolls to the anchor: a link to a closed fold would otherwise land on its summary alone.
 */
export function OpenOnHash({ id }: { id: string }) {
  useEffect(() => {
    const open = () => {
      // Our anchor ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
      const target = window.location.hash.slice(1);
      const fold = document.getElementById(id);
      if (!target || !(fold instanceof HTMLDetailsElement)) return;
      const anchor = document.getElementById(target);
      if (!anchor || !fold.contains(anchor) || fold.open) return;
      fold.open = true;
      anchor.scrollIntoView();
    };
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, [id]);
  return null;
}
