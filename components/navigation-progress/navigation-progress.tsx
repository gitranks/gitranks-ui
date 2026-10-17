'use client';

import { useLinkStatus } from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';

let pendingNavigations = 0;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const changePending = (delta: number) => {
  pendingNavigations += delta;
  for (const listener of listeners) {
    listener();
  }
};

/** Shows the progress bar while `pending` is true. */
export function useReportPendingNavigation(pending: boolean) {
  useEffect(() => {
    if (!pending) {
      return;
    }

    changePending(1);
    return () => changePending(-1);
  }, [pending]);
}

/** Render inside a `next/link` to show the progress bar while its navigation is pending. */
export function LinkPendingStatus() {
  const { pending } = useLinkStatus();
  useReportPendingNavigation(pending);
  return null;
}

/**
 * A thin bar at the top of the page while a navigation is pending. Ranking routes have no
 * loading.tsx (its boundary would stream the table into a hidden segment after the footer), so
 * a page that is not cached yet keeps the previous page on screen until it is ready.
 */
export function NavigationProgress() {
  const pending = useSyncExternalStore(
    subscribe,
    () => pendingNavigations > 0,
    () => false,
  );

  if (!pending) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden animate-navigation-progress-reveal"
    >
      <div className="h-full w-1/3 bg-primary animate-navigation-progress motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}
