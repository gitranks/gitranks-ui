'use client';

import { useEffect, useState } from 'react';

/**
 * A dialog's open state that starts open when the page's URL ends in `#id`, so a link from another page (`#rules`,
 * `#work`) opens it. Closing it drops the hash, so a reload does not open it again.
 */
export function useHashOpen(id: string): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // The ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
    if (window.location.hash.slice(1) === id) setOpen(true);
  }, [id]);

  const change = (next: boolean) => {
    setOpen(next);
    if (!next && window.location.hash.slice(1) === id) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
  };

  return [open, change];
}
