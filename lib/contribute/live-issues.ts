import type { ContributeIssue, ContributeIssuePage, ContributeIssueStatus } from './contribute.types';
import { type ContributeActionResult, contributeErrorMessage } from './errors';

/** A page of the feed, as the Issues list reads it. */
export const ISSUES_PAGE_SIZE = 20;
/** The most ids one status read asks about. */
export const ISSUE_STATUS_IDS_MAX = 50;

/** How often the shown issues are read again while the user is around, and once they have been idle a while. */
export const STATUS_POLL_MS = 20_000;
export const STATUS_IDLE_POLL_MS = 60_000;
/** No pointer, key or scroll for this long: the user is idle. */
export const STATUS_IDLE_AFTER_MS = 3 * 60_000;
/** How long a taken issue stays, saying so, before it leaves the list. */
export const LIVE_EXIT_AFTER_MS = 2_000;
/** How long it takes to fade and fold away; the classes that animate it last as long. */
export const LIVE_LEAVE_MS = 300;

/** What the user did that counts as being around. */
export const STATUS_ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];

/** Where a shown issue stands: free, the user's own agent is on it, or another contributor took it. */
export type LiveStatus = 'AVAILABLE' | 'CLAIMED_BY_YOU' | 'TAKEN';

export type LiveRow = {
  issue: ContributeIssue;
  status: LiveStatus;
  /** The user's attempt on it, with `CLAIMED_BY_YOU`. */
  attemptId: string | null;
  /** Fading and folding away: it is gone from the list once that ends. */
  leaving: boolean;
};

export type LiveSnapshot = {
  /** The rows shown, in order. */
  rows: LiveRow[];
  /** The issues the list counts: the page's total, less the ones that left. */
  total: number;
  /** The cursor after the last issue held; null when the feed has no more. */
  next: string | null;
};

/** Why a status read made the reads stop: the API hides it, does not know it yet, or the session ended. */
type PollOutcome = 'stop' | undefined;

export type LiveFeedOptions = {
  items: ContributeIssue[];
  total: number;
  next: string | null;
  /** How many rows are shown; below it, while the feed has more, the list is filled from the next issues. */
  limit: number;
  readStatus: (issueIds: string[]) => Promise<ContributeActionResult<ContributeIssueStatus[] | null>>;
  /** The next `first` issues after the cursor; left out, the list is never filled. */
  readMore?: (after: string, first: number) => Promise<ContributeActionResult<ContributeIssuePage | null>>;
  /** Read when a row's time is up: true, it leaves at once, without fading. */
  reducedMotion?: () => boolean;
};

export type LiveFeed = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => LiveSnapshot;
  /** One read of the shown rows; also fills a short list. `'stop'` when the reads should stop for good. */
  poll: () => Promise<PollOutcome>;
  /** The statuses read, applied: a taken or claimed row says so, then leaves. */
  apply: (statuses: ContributeIssueStatus[]) => void;
  /** A row the user's own action found taken (a Skip refused): it leaves as if it was read so. */
  markTaken: (issueId: string) => void;
  /** A row that is settled here (the user skipped it): never asked about again. */
  forget: (issueId: string) => void;
  /** Called with a row's id just before it leaves the list, so the focus can move off it. */
  onBeforeRemove: (handler: ((issueId: string) => void) | null) => void;
  /** Clears every pending timer: the list is gone. */
  destroy: () => void;
};

/** The reads that cannot succeed until the page is read again. */
const FINAL_ERRORS = new Set(['SIGNED_OUT', 'NOT_FOUND', 'NOT_AVAILABLE_YET']);

/**
 * The rows of a list of issues as they are now: the statuses read (and a refused Skip) mark rows taken or claimed,
 * each leaves after a moment, the total counts it out, and a page left short is filled from the next issues.
 */
export function createLiveFeed(options: LiveFeedOptions): LiveFeed {
  const { limit, readStatus, readMore, reducedMotion = () => false } = options;
  let rows: LiveRow[] = options.items.map((issue) => ({ issue, status: 'AVAILABLE', attemptId: null, leaving: false }));
  let total = options.total;
  let next = options.next;
  let snapshot: LiveSnapshot = { rows: rows.slice(0, limit), total, next };
  const settled = new Set<string>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const listeners = new Set<() => void>();
  let beforeRemove: ((issueId: string) => void) | null = null;
  let filling = false;

  const emit = () => {
    snapshot = { rows: rows.slice(0, limit), total, next };
    for (const listener of listeners) listener();
  };
  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  };
  const update = (issueId: string, patch: Partial<LiveRow>) => {
    rows = rows.map((row) => (row.issue.issueId === issueId ? { ...row, ...patch } : row));
  };

  const fill = async () => {
    const missing = limit - rows.length;
    if (filling || !readMore || !next || missing <= 0) return;
    filling = true;
    try {
      const result = await readMore(next, missing);
      if (!result.ok || !result.data) return;
      const held = new Set(rows.map(({ issue }) => issue.issueId));
      const fresh = result.data.items.filter(({ issueId }) => !held.has(issueId) && !settled.has(issueId));
      rows = [
        ...rows,
        ...fresh.map((issue) => ({ issue, status: 'AVAILABLE' as const, attemptId: null, leaving: false })),
      ];
      next = result.data.next;
      emit();
    } catch {
      // Tried again at the next read.
    } finally {
      filling = false;
    }
  };

  const remove = (issueId: string) => {
    if (!rows.some((row) => row.issue.issueId === issueId)) return;
    beforeRemove?.(issueId);
    rows = rows.filter((row) => row.issue.issueId !== issueId);
    total = Math.max(0, total - 1);
    emit();
    void fill();
  };

  /** A row that turned taken or claimed: it says so for a moment, then fades and folds away (or just goes). */
  const scheduleExit = (issueId: string) => {
    later(LIVE_EXIT_AFTER_MS, () => {
      if (reducedMotion()) {
        remove(issueId);
        return;
      }
      update(issueId, { leaving: true });
      emit();
      later(LIVE_LEAVE_MS, () => remove(issueId));
    });
  };

  const apply = (statuses: ContributeIssueStatus[]) => {
    let changed = false;
    for (const { issueId, status, attemptId } of statuses ?? []) {
      const row = rows.find((each) => each.issue.issueId === issueId);
      if (!row || row.leaving || settled.has(issueId) || status === 'AVAILABLE' || status === row.status) continue;
      // A claim of the user's own wins over "taken": a refused Skip may have been their own agent.
      if (row.status === 'CLAIMED_BY_YOU') continue;
      const first = row.status === 'AVAILABLE';
      update(issueId, { status, attemptId: status === 'CLAIMED_BY_YOU' ? (attemptId ?? null) : null });
      if (first) scheduleExit(issueId);
      changed = true;
    }
    if (changed) emit();
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    apply,
    markTaken: (issueId) => apply([{ issueId, status: 'TAKEN', attemptId: null }]),
    forget: (issueId) => {
      settled.add(issueId);
    },
    onBeforeRemove: (handler) => {
      beforeRemove = handler;
    },
    poll: async () => {
      // Rows still free, and the ones a refused Skip marked taken: those may turn out to be the user's own.
      const ids = rows
        .slice(0, limit)
        .filter(({ issue, status, leaving }) => !leaving && status !== 'CLAIMED_BY_YOU' && !settled.has(issue.issueId))
        .map(({ issue }) => issue.issueId)
        .slice(0, ISSUE_STATUS_IDS_MAX);
      void fill();
      if (!ids.length) return undefined;
      const result = await readStatus(ids);
      if (!result.ok) return FINAL_ERRORS.has(result.error) ? 'stop' : undefined;
      if (result.data === null) return 'stop';
      apply(result.data);
      return undefined;
    },
    destroy: () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}

/** What the reads need of the page: whether it is shown, and the events that say the user is around. */
export type PollEnvironment = {
  document: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  window: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  now?: () => number;
};

/**
 * Calls `poll` every 20 s while the tab is shown, every minute once the user has been idle 3 minutes (back to 20 s at
 * their next move), never while the tab is hidden, and once right when it is shown again. One read at a time; a
 * failed one is tried again at the next tick, and `'stop'` ends the reads. Returns the stop.
 */
export function startStatusPolling(poll: () => Promise<PollOutcome>, env: PollEnvironment): () => void {
  const now = env.now ?? Date.now;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let reading = false;
  let hidden = false;
  let lastActive = now();
  let lastRead = now();

  const idle = () => now() - lastActive >= STATUS_IDLE_AFTER_MS;
  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(tick, Math.max(0, ms));
  };
  const tick = async () => {
    timer = undefined;
    if (stopped) return;
    if (env.document.visibilityState !== 'visible') {
      hidden = true;
      return;
    }
    if (reading) return;
    reading = true;
    lastRead = now();
    let outcome: PollOutcome;
    try {
      outcome = await poll();
    } catch {
      outcome = undefined;
    } finally {
      reading = false;
    }
    if (stopped) return;
    if (outcome === 'stop') {
      stop();
      return;
    }
    if (!hidden) schedule(idle() ? STATUS_IDLE_POLL_MS : STATUS_POLL_MS);
  };
  const onVisibility = () => {
    if (stopped) return;
    if (env.document.visibilityState === 'visible') {
      if (!hidden) return;
      // Coming back to the tab is a move of the user's.
      hidden = false;
      lastActive = now();
      if (reading) return;
      clearTimeout(timer);
      void tick();
    } else {
      hidden = true;
      clearTimeout(timer);
      timer = undefined;
    }
  };
  const onActive = () => {
    const wasIdle = idle();
    lastActive = now();
    // Back from idle: the next read comes 20 s after the last one, not a minute.
    if (wasIdle && !stopped && !hidden && !reading) schedule(lastRead + STATUS_POLL_MS - now());
  };
  function stop() {
    stopped = true;
    clearTimeout(timer);
    env.document.removeEventListener('visibilitychange', onVisibility);
    for (const name of STATUS_ACTIVITY_EVENTS) env.window.removeEventListener(name, onActive);
  }

  env.document.addEventListener('visibilitychange', onVisibility);
  for (const name of STATUS_ACTIVITY_EVENTS) env.window.addEventListener(name, onActive, { passive: true });
  if (env.document.visibilityState === 'visible') schedule(STATUS_POLL_MS);
  else hidden = true;
  return stop;
}

/**
 * What a Skip's answer does to its card: skipped; taken meanwhile (no error to show, the card turns taken and leaves);
 * or failed, with the message its dialog shows.
 */
export function skipOutcomeOf(
  result: ContributeActionResult<boolean>,
): { kind: 'skipped' } | { kind: 'taken' } | { kind: 'failed'; message: string } {
  if (result.ok) return { kind: 'skipped' };
  if (result.error === 'ISSUE_TAKEN') return { kind: 'taken' };
  return { kind: 'failed', message: contributeErrorMessage(result.error, result.message) };
}
