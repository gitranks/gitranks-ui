import { activitySignatureOf, isRunning } from './activity-format';
import type { ContributeActivity, ContributeChangeArea, ContributeChangesRead } from './contribute.types';

/**
 * Contribute's one poll: a cheap read of what moved for the user since the version the page holds
 * (`contributeChanges`). Nothing moved, nothing happens; something did, only the parts it touches are read again.
 */

/** While a long read runs: soon, then every 10 s. */
export const CHANGES_FAST_MS = [5_000, 10_000] as const;
/** Otherwise every 30 s while the user is around, every minute once they have been idle a while. */
export const CHANGES_POLL_MS = 30_000;
export const CHANGES_IDLE_POLL_MS = 60_000;
/** No pointer, key or scroll for this long: the user is idle. */
export const CHANGES_IDLE_AFTER_MS = 3 * 60_000;
/** Failed reads back off, doubling, up to this. */
export const CHANGES_BACKOFF_MAX_MS = 5 * 60_000;
/** A focus this soon after a read reads nothing more. */
export const CHANGES_FOCUS_GAP_MS = 5_000;
/** While everything only waits (the shared queue, a pause), the bar is read again this often. */
export const ACTIVITY_WAITING_READ_MS = 5 * 60_000;

/** What the user did that counts as being around. */
export const CHANGES_ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

/** One read's outcome: read, failed (tried again, backing off), or stop for good (signed out, hidden). */
export type ChangesTick = 'ok' | 'failed' | 'stop';

/** Fast while a long read runs or a page waits on one; normal otherwise. */
export type ChangesCadence = 'fast' | 'normal';

/** What the reads need of the page: whether it is shown, and the events that say the user is around. */
export type PollEnvironment = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  now?: () => number;
};

export type ChangesPolling = {
  /** Read now (the user started something long, or the cadence turned fast), then go on at the cadence. */
  readNow: () => void;
  stop: () => void;
};

/** The wait before the next read. */
export function changesDelayOf({
  cadence,
  fastReads,
  idle,
  failures,
}: {
  cadence: ChangesCadence;
  /** Reads since the cadence turned fast. */
  fastReads: number;
  idle: boolean;
  failures: number;
}): number {
  const base =
    cadence === 'fast'
      ? (CHANGES_FAST_MS[fastReads] ?? CHANGES_FAST_MS[CHANGES_FAST_MS.length - 1])
      : idle
        ? CHANGES_IDLE_POLL_MS
        : CHANGES_POLL_MS;
  return failures ? Math.min(base * 2 ** failures, CHANGES_BACKOFF_MAX_MS) : base;
}

/**
 * Calls `tick` at `cadence()`'s pace while the tab is shown: never while it is hidden, once right when it is shown
 * again or the window gets the focus, a minute apart once the user is idle (back at their next move). One read at a
 * time; a failed one backs off, `'stop'` ends the reads.
 */
export function startChangesPolling(
  tick: () => Promise<ChangesTick>,
  cadence: () => ChangesCadence,
  env: PollEnvironment,
): ChangesPolling {
  const now = env.now ?? Date.now;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let reading = false;
  let again = false;
  let hidden = false;
  let failures = 0;
  let fastReads = 0;
  let wasFast = cadence() === 'fast';
  let lastActive = now();
  let lastRead = now();

  const idle = () => now() - lastActive >= CHANGES_IDLE_AFTER_MS;
  const delay = () => {
    const pace = cadence();
    if (pace === 'fast' && !wasFast) fastReads = 0;
    wasFast = pace === 'fast';
    return changesDelayOf({ cadence: pace, fastReads, idle: idle(), failures });
  };
  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(read, Math.max(0, ms));
  };
  const read = async () => {
    timer = undefined;
    if (stopped) return;
    if (env.document.visibilityState !== 'visible') {
      hidden = true;
      return;
    }
    if (reading) {
      again = true;
      return;
    }
    reading = true;
    lastRead = now();
    let outcome: ChangesTick;
    try {
      outcome = await tick();
    } catch {
      outcome = 'failed';
    } finally {
      reading = false;
    }
    if (stopped) return;
    if (outcome === 'stop') {
      stop();
      return;
    }
    failures = outcome === 'failed' ? failures + 1 : 0;
    if (cadence() === 'fast') fastReads += 1;
    if (hidden) return;
    if (again) {
      again = false;
      schedule(0);
      return;
    }
    schedule(delay());
  };
  const readSoon = () => {
    if (stopped || hidden) return;
    if (reading) {
      again = true;
      return;
    }
    schedule(0);
  };
  const onVisibility = () => {
    if (stopped) return;
    if (env.document.visibilityState === 'visible') {
      if (!hidden) return;
      // Coming back to the tab is a move of the user's.
      hidden = false;
      lastActive = now();
      readSoon();
    } else {
      hidden = true;
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const onFocus = () => {
    lastActive = now();
    if (now() - lastRead >= CHANGES_FOCUS_GAP_MS) readSoon();
  };
  const onActive = () => {
    const wasIdle = idle();
    lastActive = now();
    // Back from idle: the next read comes at the normal pace after the last one, not a minute.
    if (wasIdle && !stopped && !hidden && !reading) schedule(lastRead + delay() - now());
  };
  function stop() {
    stopped = true;
    clearTimeout(timer);
    env.document.removeEventListener('visibilitychange', onVisibility);
    env.window.removeEventListener('focus', onFocus);
    for (const name of CHANGES_ACTIVITY_EVENTS) env.window.removeEventListener(name, onActive);
  }

  env.document.addEventListener('visibilitychange', onVisibility);
  env.window.addEventListener('focus', onFocus);
  for (const name of CHANGES_ACTIVITY_EVENTS) env.window.addEventListener(name, onActive, { passive: true });
  if (env.document.visibilityState === 'visible') schedule(delay());
  else hidden = true;
  return {
    readNow: () => {
      fastReads = 0;
      failures = 0;
      readSoon();
    },
    stop,
  };
}

/** A version's parts (`<personal>.<pool>`); null for one no read answered. */
function partsOf(version: string | null | undefined): [number, number] | null {
  const match = /^(\d+)\.(\d+)$/.exec(version ?? '');
  return match ? [Number(match[1]), Number(match[2])] : null;
}

/**
 * Whether a page read's version should replace the one held: not when it is older in both parts (a read that began
 * before the last poll), so the poll that follows it names nothing twice. A reset (the data deleted) is caught by the
 * next poll, which names every area.
 */
export function takesVersion(read: string | null | undefined, held: string | null): boolean {
  const next = partsOf(read);
  if (!next) return false;
  const current = partsOf(held);
  if (!current) return true;
  return !(next[0] <= current[0] && next[1] <= current[1]);
}

/** The areas that make each page read itself again; `ISSUES` never does (the cards ask about themselves). */
const REFRESHED_BY: [test: (path: string) => boolean, areas: ContributeChangeArea[]][] = [
  [(path) => path === '/contribute', ['ATTEMPTS', 'FEED', 'SET', 'SETTINGS']],
  [(path) => path === '/contribute/connect', ['FEED', 'SETTINGS']],
  [(path) => path === '/contribute/issues', ['FEED', 'SET', 'SETTINGS']],
  [(path) => path === '/contribute/me', ['ATTEMPTS']],
  [(path) => path.startsWith('/contribute/attempts/'), ['ATTEMPTS']],
  [(path) => path === '/contribute/settings' || path.startsWith('/contribute/settings/'), ['SET', 'SETTINGS']],
];

/** Whether the page at `pathname` reads itself again for these changes. */
export function refreshesFor(pathname: string, changed: readonly ContributeChangeArea[]): boolean {
  const path = pathname.replace(/\/+$/, '') || '/';
  const areas = REFRESHED_BY.find(([test]) => test(path))?.[1] ?? [];
  return changed.some((area) => areas.includes(area));
}

/** Whether a tick reads the bar too: something runs or may have started, or a wait is due its slow look. */
export function readsActivity({
  activity,
  running,
  waitingReadDue,
}: {
  activity: ContributeActivity | null;
  /** The last poll's flag, or the user just started something. */
  running: boolean;
  waitingReadDue: boolean;
}): boolean {
  if (running) return true;
  return !!activity?.items.length && waitingReadDue;
}

/** What the poll holds between reads. */
export type HeldChanges = {
  version: string | null;
  activity: ContributeActivity | null;
  /** The work in progress as `activitySignatureOf` sums it: a move of it reads the page again. */
  signature: string;
  /** A long read may run: the poll goes fast and reads the bar. */
  running: boolean;
  activityReadAt: number;
};

export const runningOf = (activity: ContributeActivity | null) => !!activity?.items.some(isRunning);

/** What the poll holds at first, from the page's read. */
export const heldOf = (version: string | null, activity: ContributeActivity | null, now: number): HeldChanges => ({
  version,
  activity,
  signature: activitySignatureOf(activity),
  running: runningOf(activity),
  activityReadAt: now,
});

/**
 * One read taken: the version and the flag it answered, the work in progress when it was read too, and whether the
 * page at `pathname` reads itself again (it shows what moved, or the work moved on: a repo read, an item ended).
 */
export function afterChangesRead(
  held: HeldChanges,
  read: ContributeChangesRead,
  pathname: string,
  now: number,
): { held: HeldChanges; refresh: boolean } {
  const { changes, activity } = read;
  let next: HeldChanges = { ...held, version: changes.version, running: changes.activity };
  let moved = false;
  if (activity !== undefined) {
    const signature = activitySignatureOf(activity);
    moved = !!held.signature && signature !== held.signature;
    // The flag is settled by the bar's own read, so it may lag a read behind: running items keep the pace.
    next = { ...next, activity, signature, activityReadAt: now, running: next.running || runningOf(activity) };
  }
  return { held: next, refresh: moved || refreshesFor(pathname, changes.changed) };
}
