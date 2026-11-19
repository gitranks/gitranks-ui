/** Step 3 waits this long, of the page being shown, for the agent to take the issue; then it says so: Check again. */
export const START_WAIT_FOR_MS = 30 * 60_000;

/** How often the wait asks by itself while the page is shown, for a tab where no poll runs (`onTick`). */
export const START_FALLBACK_ASK_MS = 10_000;

/** What the wait needs of the page: whether it is shown, and the event that says it was shown or hidden. */
export type StartWatchPage = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
};

/**
 * Step 3's wait for the agent, apart from React. The page asks about the issue on each change of the viewer's
 * attempts (the workspace's one poll); this counts only the time the page is shown, tells `onShown` each time the page
 * is shown again (so the page asks once then), calls `onTick` every 10 seconds while the page is shown (the page asks
 * then only when no poll runs in the tab), and once `forMs` of shown time have passed calls `onTimeout`, once. `stop`
 * ends it with nothing more.
 */
export function startShownWait(
  { onTimeout, onShown, onTick }: { onTimeout: () => void; onShown: () => void; onTick?: () => void },
  { document }: StartWatchPage,
  forMs = START_WAIT_FOR_MS,
): { stop: () => void } {
  let stopped = false;
  // Time with the page shown: what earlier showings added up to, and when the current one began.
  let shownMs = 0;
  let shownAt: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ticks = onTick
    ? setInterval(() => {
        if (!stopped && document.visibilityState === 'visible') onTick();
      }, START_FALLBACK_ASK_MS)
    : undefined;

  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    clearInterval(ticks);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  const shown = () => {
    shownAt = Date.now();
    timer = setTimeout(
      () => {
        stop();
        onTimeout();
      },
      Math.max(0, forMs - shownMs),
    );
  };
  function onVisibility() {
    if (stopped) return;
    if (document.visibilityState === 'visible') {
      if (shownAt !== null) return;
      shown();
      onShown();
    } else if (shownAt !== null) {
      clearTimeout(timer);
      shownMs += Date.now() - shownAt;
      shownAt = null;
    }
  }

  document.addEventListener('visibilitychange', onVisibility);
  if (document.visibilityState === 'visible') shown();
  return { stop };
}
