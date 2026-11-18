import { LEARN_START_POLL_FOR_MS, LEARN_START_POLL_MS } from './learn-start';

/**
 * One ask's outcome: go on asking, stop for good (the agent took the issue as a lesson), or give up (nothing more can
 * be asked now: the session ended, the API does not answer it), which ends the wait as its 30 minutes would.
 */
export type LearnStartTick = 'go' | 'stop' | 'give-up';

/** What the poll needs of the page: whether it is shown, and the event that says it was shown again. */
export type LearnStartPollPage = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
};

/**
 * Step 3's wait for the agent to take the issue: an ask at once and every 5 seconds while the page is shown, at once
 * again when it is shown after being hidden, never two at a time. Only time with the page shown counts towards the
 * 30 minutes (`forMs`); once they are up, or an ask gives up, `onTimeout` runs, once. `stop` ends it with nothing more.
 */
export function startLearnStartPoll(
  ask: () => Promise<LearnStartTick>,
  onTimeout: () => void,
  { document }: LearnStartPollPage,
  forMs = LEARN_START_POLL_FOR_MS,
): { stop: () => void } {
  let stopped = false;
  let asking = false;
  // Time with the page shown: what earlier showings added up to, and when the current one began.
  let shownMs = 0;
  let shownAt: number | null = document.visibilityState === 'visible' ? Date.now() : null;
  const shownFor = () => shownMs + (shownAt === null ? 0 : Date.now() - shownAt);

  const stop = () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  const giveUp = () => {
    stop();
    onTimeout();
  };
  const tick = async () => {
    if (stopped) return;
    if (shownFor() >= forMs) {
      giveUp();
      return;
    }
    if (asking || document.visibilityState !== 'visible') return;
    asking = true;
    let next: LearnStartTick = 'go';
    try {
      next = await ask();
    } catch {
      // Offline, or a deploy under way: the next ask tries again.
    } finally {
      asking = false;
    }
    if (stopped) return;
    if (next === 'stop') stop();
    else if (next === 'give-up') giveUp();
  };
  function onVisibility() {
    if (document.visibilityState === 'visible') {
      shownAt ??= Date.now();
      void tick();
    } else if (shownAt !== null) {
      shownMs += Date.now() - shownAt;
      shownAt = null;
    }
  }

  const timer = setInterval(() => void tick(), LEARN_START_POLL_MS);
  document.addEventListener('visibilitychange', onVisibility);
  void tick();
  return { stop };
}
