'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { movedAnchorOf } from '@/lib/contribute/settings-paths';

/**
 * Sends a link to a section of the old one-page Settings (`#limits`, `#access`…) on to the page it is on now, and
 * scrolls to an anchor that stayed on the summary once the summary is on the page.
 */
export function SettingsAnchors() {
  const router = useRouter();

  useEffect(() => {
    // The section ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
    const anchor = window.location.hash.slice(1);
    if (!anchor) return;
    const moved = movedAnchorOf(anchor);
    if (moved) router.replace(moved);
    else document.getElementById(anchor)?.scrollIntoView();
  }, [router]);

  return null;
}
