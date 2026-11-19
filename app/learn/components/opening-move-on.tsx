'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Where the Lesson view remembers, for this tab only, that it watched the pull request open. */
const keyOf = (attemptId: string) => `gitranks:learn:opening:${attemptId}`;

/** The tab's `sessionStorage`, or null when the browser blocks it. */
function store(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Drawn while the pull request opens on the Lesson view: the tab remembers it watched. */
export function WatchingOpen({ attemptId }: { attemptId: string }) {
  useEffect(() => {
    try {
      store()?.setItem(keyOf(attemptId), '1');
    } catch {
      // Storage off or full: the page stays on the lesson once it opens, the share card in view.
    }
  }, [attemptId]);
  return null;
}

/**
 * Drawn once the pull request is open: a tab that watched it open on the Lesson view goes on to the Pull request view,
 * once. A tab that only opens the lesson later stays where it is.
 */
export function MoveOnOnceOpen({ attemptId, to }: { attemptId: string; to: Route }) {
  const router = useRouter();
  useEffect(() => {
    let watched = false;
    try {
      const tab = store();
      watched = tab?.getItem(keyOf(attemptId)) === '1';
      tab?.removeItem(keyOf(attemptId));
    } catch {
      watched = false;
    }
    if (watched) router.replace(to);
  }, [attemptId, to, router]);
  return null;
}
