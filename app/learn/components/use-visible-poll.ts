'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `tick` every `everyMs` while the tab is shown, and at once when it is shown again; never two at a time, never
 * while hidden. Off while `enabled` is false.
 */
export function useVisiblePoll(tick: () => unknown, everyMs: number, enabled = true) {
  const latest = useRef(tick);
  latest.current = tick;
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    let live = true;
    const run = async () => {
      if (busy || !live || document.hidden) return;
      busy = true;
      try {
        await latest.current();
      } catch {
        // A read that failed is tried again at the next tick.
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(run, everyMs);
    const onShown = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener('visibilitychange', onShown);
    return () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShown);
    };
  }, [everyMs, enabled]);
}
