import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { issue } from './__fixtures__/contribute-overview';
import type { ContributeIssue, ContributeIssuePage, ContributeIssueStatus } from './contribute.types';
import type { ContributeActionResult } from './errors';
import { createLiveFeed, LIVE_EXIT_AFTER_MS, LIVE_LEAVE_MS, type LiveFeedOptions, skipOutcomeOf } from './live-issues';

type StatusRead = ContributeActionResult<ContributeIssueStatus[] | null>;

const ISSUES: ContributeIssue[] = [1, 2, 3, 4].map((n) => issue({ issueId: `I_${n}`, number: n, rank: n }));
const taken = (issueId: string): ContributeIssueStatus => ({ issueId, status: 'TAKEN', attemptId: null });
const yours = (issueId: string, attemptId: string): ContributeIssueStatus => ({
  issueId,
  status: 'CLAIMED_BY_YOU',
  attemptId,
});

const feedOf = (patch: Partial<LiveFeedOptions> = {}) =>
  createLiveFeed({
    items: ISSUES,
    total: 42,
    next: null,
    limit: 20,
    readStatus: vi.fn(async (): Promise<StatusRead> => ({ ok: true, data: [] })),
    ...patch,
  });

const ids = (feed: ReturnType<typeof createLiveFeed>) => feed.getSnapshot().rows.map(({ issue }) => issue.issueId);
const rowOf = (feed: ReturnType<typeof createLiveFeed>, id: string) =>
  feed.getSnapshot().rows.find(({ issue }) => issue.issueId === id);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('a live list of issues', () => {
  it('marks a taken issue at once, folds it away after the moment, then drops it and counts it out', async () => {
    const feed = feedOf();
    const listener = vi.fn();
    feed.subscribe(listener);

    feed.apply([taken('I_2'), { issueId: 'I_1', status: 'AVAILABLE', attemptId: null }]);
    expect(rowOf(feed, 'I_2')).toMatchObject({ status: 'TAKEN', leaving: false });
    expect(rowOf(feed, 'I_1')?.status).toBe('AVAILABLE');
    expect(feed.getSnapshot().total).toBe(42);

    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS - 1);
    expect(rowOf(feed, 'I_2')?.leaving).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(rowOf(feed, 'I_2')?.leaving).toBe(true);
    expect(ids(feed)).toContain('I_2');

    await vi.advanceTimersByTimeAsync(LIVE_LEAVE_MS);
    expect(ids(feed)).toEqual(['I_1', 'I_3', 'I_4']);
    expect(feed.getSnapshot().total).toBe(41);
    expect(listener).toHaveBeenCalled();
  });

  it('drops a taken issue with no fold under reduced motion', async () => {
    const feed = feedOf({ reducedMotion: () => true });
    const seen: boolean[] = [];
    feed.subscribe(() => seen.push(!!rowOf(feed, 'I_1')?.leaving));

    feed.apply([taken('I_1')]);
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);

    expect(ids(feed)).toEqual(['I_2', 'I_3', 'I_4']);
    expect(seen).not.toContain(true);
  });

  it("keeps the user's attempt on an issue their agent took, and lets it leave the same way", async () => {
    const feed = feedOf();

    feed.apply([yours('I_3', 'A_9')]);
    expect(rowOf(feed, 'I_3')).toMatchObject({ status: 'CLAIMED_BY_YOU', attemptId: 'A_9' });

    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS + LIVE_LEAVE_MS);
    expect(ids(feed)).not.toContain('I_3');
  });

  it("turns a Skip refused as taken into a taken row, and then the user's own claim if a read says so", async () => {
    const readStatus = vi.fn(async (): Promise<StatusRead> => ({ ok: true, data: [yours('I_1', 'A_1')] }));
    const feed = feedOf({ readStatus });

    feed.markTaken('I_1');
    expect(rowOf(feed, 'I_1')?.status).toBe('TAKEN');
    // Read at once, alone: the regular reads come too late for a row that leaves in 2 s.
    expect(readStatus).toHaveBeenCalledWith(['I_1']);
    await vi.advanceTimersByTimeAsync(0);
    expect(rowOf(feed, 'I_1')).toMatchObject({ status: 'CLAIMED_BY_YOU', attemptId: 'A_1' });

    // One exit, from the first change: the claim does not hold it longer.
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS + LIVE_LEAVE_MS);
    expect(ids(feed)).not.toContain('I_1');
    expect(feed.getSnapshot().total).toBe(41);
  });

  it('asks about the shown free rows alone, never one skipped here, taken or claimed', async () => {
    const readStatus = vi.fn(async (): Promise<StatusRead> => ({ ok: true, data: [] }));
    const feed = feedOf({ readStatus, limit: 4 });

    feed.forget('I_2');
    feed.apply([yours('I_3', 'A_3'), taken('I_4')]);
    await feed.poll();

    expect(readStatus).toHaveBeenCalledWith(['I_1']);
  });

  it('drops an answer that comes after it stopped: no new timers, no fill for a gone page', async () => {
    let answer: (value: StatusRead) => void = () => undefined;
    const readStatus = vi.fn(() => new Promise<StatusRead>((resolve) => (answer = resolve)));
    const readMore = vi.fn(async () => ({ ok: false as const, error: 'FAILED' as const }));
    const feed = feedOf({ readStatus, readMore, next: 'c2', limit: 4 });

    const read = feed.poll();
    feed.stop();
    answer({ ok: true, data: [taken('I_1')] });
    await read;
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS * 5);

    expect(rowOf(feed, 'I_1')?.status).toBe('AVAILABLE');
    expect(ids(feed)).toHaveLength(4);
    expect(readMore).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sends the rows on their way out again when it starts after a stop', async () => {
    const feed = feedOf({ reducedMotion: () => true });

    feed.apply([taken('I_1')]);
    feed.stop();
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS * 2);
    expect(ids(feed)).toContain('I_1');

    feed.start();
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);
    expect(ids(feed)).not.toContain('I_1');
  });

  it('takes in a newer read of the page, keeping what it knows, and lets a dropped taken row finish its way out', async () => {
    const feed = feedOf({ reducedMotion: () => true });

    feed.apply([taken('I_2'), yours('I_3', 'A_3')]);
    // The newer read no longer lists I_2 (its total already counts it out), and still lists I_3.
    feed.reset({ items: [ISSUES[0], ISSUES[2], ISSUES[3], issue({ issueId: 'I_5', rank: 5 })], total: 40, next: null });

    expect(ids(feed)).toEqual(['I_1', 'I_2', 'I_3', 'I_4', 'I_5']);
    expect(rowOf(feed, 'I_2')?.status).toBe('TAKEN');
    expect(rowOf(feed, 'I_3')).toMatchObject({ status: 'CLAIMED_BY_YOU', attemptId: 'A_3' });
    expect(feed.getSnapshot().total).toBe(40);

    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);
    expect(ids(feed)).toEqual(['I_1', 'I_4', 'I_5']);
    // I_2 was counted out by the newer read already; I_3 was still counted in it.
    expect(feed.getSnapshot().total).toBe(39);
  });

  it('drops a fill asked for before a newer read of the page', async () => {
    let answer: (value: ContributeActionResult<ContributeIssuePage | null>) => void = () => undefined;
    const readMore = vi.fn(() => new Promise<ContributeActionResult<ContributeIssuePage | null>>((r) => (answer = r)));
    const feed = feedOf({ items: ISSUES.slice(0, 1), limit: 2, next: 'c2', readMore });

    const read = feed.poll();
    feed.reset({ items: ISSUES.slice(0, 2), total: 2, next: null });
    answer({ ok: true, data: { items: [issue({ issueId: 'I_9' })], next: 'c9', total: 9, computedAt: null } });
    await read;
    await vi.advanceTimersByTimeAsync(0);

    expect(ids(feed)).toEqual(['I_1', 'I_2']);
    expect(feed.getSnapshot().next).toBeNull();
  });

  it('fills every slot when two rows leave close together', async () => {
    const pages = [
      { items: [issue({ issueId: 'I_5', rank: 5 })], next: 'c3' },
      { items: [issue({ issueId: 'I_6', rank: 6 })], next: null },
    ];
    const readMore = vi.fn(
      async (): Promise<ContributeActionResult<ContributeIssuePage | null>> => ({
        ok: true,
        data: { ...(pages.shift() ?? { items: [], next: null }), total: 0, computedAt: null },
      }),
    );
    const feed = feedOf({ limit: 4, next: 'c2', readMore, reducedMotion: () => true });

    feed.apply([taken('I_1'), taken('I_2')]);
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);

    expect(ids(feed)).toEqual(['I_3', 'I_4', 'I_5', 'I_6']);
    expect(readMore).toHaveBeenCalledTimes(2);
  });

  it('fills a page left short from the next issues, under the cursor, and moves the cursor on', async () => {
    const readMore = vi.fn(
      async (): Promise<ContributeActionResult<ContributeIssuePage | null>> => ({
        ok: true,
        data: {
          items: [ISSUES[0], ISSUES[3]],
          next: 'c3',
          total: 40,
          computedAt: null,
        },
      }),
    );
    const feed = feedOf({ items: ISSUES.slice(0, 3), limit: 3, next: 'c2', readMore, reducedMotion: () => true });

    feed.apply([taken('I_2')]);
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);

    expect(readMore).toHaveBeenCalledWith('c2', 1);
    // The one already held is not shown twice; the list is back to its size.
    expect(ids(feed)).toEqual(['I_1', 'I_3', 'I_4']);
    expect(feed.getSnapshot().next).toBe('c3');
    expect(feed.getSnapshot().total).toBe(41);
  });

  it('shows the next pick in place of one that left, when more are held than shown', async () => {
    const feed = feedOf({ limit: 3, reducedMotion: () => true });
    expect(ids(feed)).toEqual(['I_1', 'I_2', 'I_3']);

    feed.apply([taken('I_1')]);
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);

    expect(ids(feed)).toEqual(['I_2', 'I_3', 'I_4']);
  });

  it('tries a failed fill again at the next read', async () => {
    const readMore = vi
      .fn<NonNullable<LiveFeedOptions['readMore']>>()
      .mockResolvedValueOnce({ ok: false, error: 'FAILED' })
      .mockResolvedValueOnce({
        ok: true,
        data: { items: [issue({ issueId: 'I_9', rank: 9 })], next: null, total: 1, computedAt: null },
      });
    const feed = feedOf({ items: ISSUES.slice(0, 1), limit: 2, next: 'c2', readMore });

    await feed.poll();
    expect(ids(feed)).toEqual(['I_1']);
    await feed.poll();
    expect(ids(feed)).toEqual(['I_1', 'I_9']);
    expect(feed.getSnapshot().next).toBeNull();
  });

  it('moves the focus off a row just before it leaves', async () => {
    const feed = feedOf({ reducedMotion: () => true });
    const before = vi.fn((id: string) => expect(ids(feed)).toContain(id));
    feed.onBeforeRemove(before);

    feed.apply([taken('I_4')]);
    await vi.advanceTimersByTimeAsync(LIVE_EXIT_AFTER_MS);

    expect(before).toHaveBeenCalledWith('I_4');
  });

  it('stops the reads when the API hides them, and keeps on after a failed one', async () => {
    expect(await feedOf({ readStatus: async () => ({ ok: true, data: null }) }).poll()).toBe('stop');
    expect(await feedOf({ readStatus: async () => ({ ok: false, error: 'NOT_AVAILABLE_YET' }) }).poll()).toBe('stop');
    expect(await feedOf({ readStatus: async () => ({ ok: false, error: 'SIGNED_OUT' }) }).poll()).toBe('stop');
    expect(await feedOf({ readStatus: async () => ({ ok: false, error: 'FAILED' }) }).poll()).toBeUndefined();
  });
});

describe('a Skip answered', () => {
  it('turns the card taken, with no error, when the issue was taken meanwhile', () => {
    expect(skipOutcomeOf({ ok: false, error: 'ISSUE_TAKEN' })).toEqual({ kind: 'taken' });
    expect(skipOutcomeOf({ ok: true, data: true })).toEqual({ kind: 'skipped' });
    expect(skipOutcomeOf({ ok: false, error: 'FAILED' })).toEqual({
      kind: 'failed',
      message: 'Something went wrong. Try again in a minute.',
    });
  });
});
