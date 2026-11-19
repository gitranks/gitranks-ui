'use client';

import { useEffect, useRef } from 'react';

/** What a tick answers to stop the poll for good: the page can't learn anything more by asking. */
export const STOP_POLL = 'stop';

/**
 * Calls `tick` every `everyMs` while the tab is shown, and at once when it is shown again; never two at a time, never
 * while hidden. A tick that answers `STOP_POLL` ends it. Off while `enabled` is false.
 */
export function useVisiblePoll(tick: () => unknown, everyMs: number, enabled = true) {
  const latest = useRef(tick);
  useEffect(() => {
    latest.current = tick;
  });
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    let live = true;
    const stop = () => {
      live = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShown);
    };
    const run = async () => {
      if (busy || !live || document.hidden) return;
      busy = true;
      try {
        if ((await latest.current()) === STOP_POLL) stop();
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
    return stop;
  }, [everyMs, enabled]);
}
