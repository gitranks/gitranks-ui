import type { ContributeIssue, ContributeIssuePage, ContributeIssueStatus } from './contribute.types';
import { type ContributeActionResult, contributeErrorMessage } from './errors';

/** A page of the feed, as the Issues list reads it. */
export const ISSUES_PAGE_SIZE = 20;
/** The most ids one status read asks about. */
export const ISSUE_STATUS_IDS_MAX = 50;

/** How long a taken issue stays, saying so, before it leaves the list. */
export const LIVE_EXIT_AFTER_MS = 2_000;
/** How long it takes to fade and fold away; the classes that animate it last as long. */
export const LIVE_LEAVE_MS = 300;

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
  /**
   * A row the user's own action found taken (a Skip refused): it leaves as if it was read so, and is read at once in
   * case it was the user's own agent that took it.
   */
  markTaken: (issueId: string) => void;
  /** A row that is settled here (the user skipped it): never asked about again. */
  forget: (issueId: string) => void;
  /** Called with a row's id just before it leaves the list, so the focus can move off it. */
  onBeforeRemove: (handler: ((issueId: string) => void) | null) => void;
  /**
   * A newer read of the page (a refresh, other filters, another cursor): its rows replace the list, keeping what is
   * known of the ones still in it; a row it drops while it says it was taken stays until it has left.
   */
  reset: (page: { items: ContributeIssue[]; total: number; next: string | null }) => void;
  /** Starts it again after `stop`: the rows on their way out are sent out again. */
  start: () => void;
  /** Stops it: no timers, and an answer still on its way is dropped. */
  stop: () => void;
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
  /** Rows the page's total no longer counts (a newer read dropped them): they leave without counting out again. */
  const uncounted = new Set<string>();
  let beforeRemove: ((issueId: string) => void) | null = null;
  let filling = false;
  let active = true;
  /** Bumped by a stop or a newer read: an answer asked for before it is dropped. */
  let generation = 0;

  const emit = () => {
    snapshot = { rows: rows.slice(0, limit), total, next };
    for (const listener of listeners) listener();
  };
  const fresh = (issue: ContributeIssue): LiveRow => ({ issue, status: 'AVAILABLE', attemptId: null, leaving: false });
  const later = (ms: number, run: () => void) => {
    if (!active) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      run();
    }, ms);
    timers.add(timer);
  };
  const update = (issueId: string, patch: Partial<LiveRow>) => {
    rows = rows.map((row) => (row.issue.issueId === issueId ? { ...row, ...patch } : row));
  };

  const fill = async (): Promise<void> => {
    const missing = limit - rows.length;
    if (!active || filling || !readMore || !next || missing <= 0) return;
    filling = true;
    const asked = generation;
    let added = false;
    try {
      const result = await readMore(next, missing);
      if (asked !== generation || !result.ok || !result.data) return;
      const held = new Set(rows.map(({ issue }) => issue.issueId));
      const more = result.data.items.filter(({ issueId }) => !held.has(issueId) && !settled.has(issueId));
      rows = [...rows, ...more.map(fresh)];
      next = result.data.next;
      added = more.length > 0;
      emit();
    } catch {
      // Tried again at the next read.
    } finally {
      filling = false;
    }
    // More rows left meanwhile: the next ones are read too, while the reads still bring some.
    if (added) await fill();
  };

  const remove = (issueId: string) => {
    if (!rows.some((row) => row.issue.issueId === issueId)) return;
    beforeRemove?.(issueId);
    rows = rows.filter((row) => row.issue.issueId !== issueId);
    if (!uncounted.delete(issueId)) total = Math.max(0, total - 1);
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
    if (!active) return;
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

  /** Asks about these ids; the answer is applied unless the list moved on meanwhile. */
  const read = async (ids: string[]): Promise<PollOutcome> => {
    const asked = generation;
    const result = await readStatus(ids);
    if (asked !== generation) return undefined;
    if (!result.ok) return FINAL_ERRORS.has(result.error) ? 'stop' : undefined;
    if (result.data === null) return 'stop';
    apply(result.data);
    return undefined;
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    apply,
    markTaken: (issueId) => {
      apply([{ issueId, status: 'TAKEN', attemptId: null }]);
      if (active) read([issueId]).catch(() => undefined);
    },
    forget: (issueId) => {
      settled.add(issueId);
    },
    onBeforeRemove: (handler) => {
      beforeRemove = handler;
    },
    poll: async () => {
      if (!active) return undefined;
      const ids = rows
        .slice(0, limit)
        .filter(({ issue, status }) => status === 'AVAILABLE' && !settled.has(issue.issueId))
        .map(({ issue }) => issue.issueId)
        .slice(0, ISSUE_STATUS_IDS_MAX);
      void fill();
      return ids.length ? read(ids) : undefined;
    },
    reset: (page) => {
      generation += 1;
      const was = new Map(rows.map((row, at) => [row.issue.issueId, { row, at }]));
      const ids = new Set(page.items.map(({ issueId }) => issueId));
      const merged = page.items.map((issue) => {
        const known = was.get(issue.issueId)?.row;
        return known ? { ...known, issue } : fresh(issue);
      });
      for (const [issueId, { row, at }] of was) {
        if (ids.has(issueId) || row.status === 'AVAILABLE') continue;
        merged.splice(Math.min(at, merged.length), 0, row);
        uncounted.add(issueId);
      }
      rows = merged;
      total = page.total;
      next = page.next;
      emit();
      void fill();
    },
    start: () => {
      if (active) return;
      active = true;
      for (const { issue, status, leaving } of rows) {
        if (leaving) later(LIVE_LEAVE_MS, () => remove(issue.issueId));
        else if (status !== 'AVAILABLE') scheduleExit(issue.issueId);
      }
    },
    stop: () => {
      active = false;
      generation += 1;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
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
