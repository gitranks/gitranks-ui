'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { movedAnchorOf, renamedAnchorOf } from '@/lib/workspace/paths';

/**
 * Sends a link to a section of the old one-page Settings (`#limits`, `#access`…) on to the page it is on now, and
 * scrolls to an anchor that stayed on the page once it is on it, under its new name for a group that was renamed
 * (`#for-learning` is `#learn-preferences`). `only`: the anchors this page sends on, for a page that took over one old
 * section (the model page's `#prs`); the rest stay where they are.
 */
export function SettingsAnchors({ only }: { only?: readonly string[] }) {
  const router = useRouter();

  useEffect(() => {
    // The section ids are plain ASCII, so the hash needs no decoding (which throws on a stray `%`).
    const anchor = window.location.hash.slice(1);
    if (!anchor) return;
    const moved = only && !only.includes(anchor) ? null : movedAnchorOf(anchor);
    if (moved) router.replace(moved);
    else document.getElementById(renamedAnchorOf(anchor))?.scrollIntoView();
  }, [router, only]);

  return null;
}
