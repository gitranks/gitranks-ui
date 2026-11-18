import { LEARN_START_POLL_FOR_MS, LEARN_START_POLL_MS } from './learn-start';

/** One ask's outcome: go on asking, or stop for good (the agent took the issue as a lesson, or the session ended). */
export type LearnStartTick = 'go' | 'stop';

/** What the poll needs of the page: whether it is shown, and the event that says it was shown again. */
export type LearnStartPollPage = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
};

/** The asks step 3 makes at most: 30 minutes of the page shown, one every 5 seconds. */
export const LEARN_START_ASKS = Math.round(LEARN_START_POLL_FOR_MS / LEARN_START_POLL_MS);

/**
 * Step 3's wait for the agent to take the issue: an ask at once and every 5 seconds while the page is shown, at once
 * again when it is shown after being hidden, never two at a time. A hidden page asks nothing, so the 30 minutes are
 * minutes of the page shown. After the last ask `onTimeout` runs, once; `stop` ends it with nothing more.
 */
export function startLearnStartPoll(
  ask: () => Promise<LearnStartTick>,
  onTimeout: () => void,
  { document }: LearnStartPollPage,
  asks = LEARN_START_ASKS,
): { stop: () => void } {
  let stopped = false;
  let asking = false;
  let made = 0;

  const stop = () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onShown);
  };
  const tick = async () => {
    if (stopped || asking || document.visibilityState !== 'visible') return;
    asking = true;
    made += 1;
    let next: LearnStartTick = 'go';
    try {
      next = await ask();
    } catch {
      // Offline, or a deploy under way: the next ask tries again.
    } finally {
      asking = false;
    }
    if (stopped) return;
    if (next === 'stop') {
      stop();
      return;
    }
    if (made >= asks) {
      stop();
      onTimeout();
    }
  };
  function onShown() {
    if (document.visibilityState === 'visible') void tick();
  }

  const timer = setInterval(() => void tick(), LEARN_START_POLL_MS);
  document.addEventListener('visibilitychange', onShown);
  void tick();
  return { stop };
}
