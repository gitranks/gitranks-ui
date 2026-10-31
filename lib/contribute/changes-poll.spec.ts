import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changesPollRunning,
  emitContributeChanges,
  fastChangesHeld,
  holdFastChanges,
  onContributeChanges,
  setChangesWake,
} from './changes-bus';
import {
  ACTIVITY_WAITING_READ_MS,
  afterChangesRead,
  CHANGES_BACKOFF_MAX_MS,
  CHANGES_FAST_MS,
  CHANGES_IDLE_AFTER_MS,
  CHANGES_IDLE_POLL_MS,
  CHANGES_POLL_MS,
  type ChangesCadence,
  type ChangesTick,
  changesDelayOf,
  heldOf,
  readsActivity,
  refreshesFor,
  startChangesPolling,
  takesVersion,
} from './changes-poll';
import type { ContributeActivity, ContributeActivityItem } from './contribute.types';

const AT = '2026-10-31T21:00:00.000Z';
const item = (kind: ContributeActivityItem['kind'], done = 0): ContributeActivityItem => ({
  kind,
  tabs: ['ISSUES', 'SETTINGS'],
  label: 'Reading issues from 2 of 3 repos',
  done,
  total: 3,
  startedAt: AT,
  expectedAt: null,
  repos: [{ repositoryId: 'R_1', nameWithOwner: 'acme/one', stage: done ? 'READ' : 'READING' }],
});
const activityOf = (...items: ContributeActivityItem[]): ContributeActivity => ({ items, readAt: AT });

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the poll’s pace', () => {
  it('goes 5 then 10 s while a long read runs, 30 s otherwise, a minute when idle, and backs off on failures', () => {
    expect(changesDelayOf({ cadence: 'fast', fastReads: 0, idle: false, failures: 0 })).toBe(CHANGES_FAST_MS[0]);
    expect(changesDelayOf({ cadence: 'fast', fastReads: 1, idle: true, failures: 0 })).toBe(10_000);
    expect(changesDelayOf({ cadence: 'fast', fastReads: 9, idle: false, failures: 0 })).toBe(10_000);
    expect(changesDelayOf({ cadence: 'normal', fastReads: 0, idle: false, failures: 0 })).toBe(30_000);
    expect(changesDelayOf({ cadence: 'normal', fastReads: 0, idle: true, failures: 0 })).toBe(60_000);
    expect(changesDelayOf({ cadence: 'normal', fastReads: 0, idle: false, failures: 2 })).toBe(120_000);
    expect(changesDelayOf({ cadence: 'normal', fastReads: 0, idle: false, failures: 9 })).toBe(CHANGES_BACKOFF_MAX_MS);
  });
});

describe('the one poll', () => {
  /** A page: shown or hidden, focused, and where the user's moves are heard. */
  const pageOf = (visibilityState: DocumentVisibilityState = 'visible') => {
    const document = Object.assign(new EventTarget(), { visibilityState });
    const window = new EventTarget();
    return {
      env: { document, window } as unknown as Parameters<typeof startChangesPolling>[2],
      show: () => {
        document.visibilityState = 'visible';
        document.dispatchEvent(new Event('visibilitychange'));
      },
      hide: () => {
        document.visibilityState = 'hidden';
        document.dispatchEvent(new Event('visibilitychange'));
      },
      focus: () => window.dispatchEvent(new Event('focus')),
      move: () => window.dispatchEvent(new Event('pointermove')),
    };
  };
  const normal = (): ChangesCadence => 'normal';
  const ok = () => vi.fn(async (): Promise<ChangesTick> => 'ok');

  it('reads every 30 s while the tab is shown', async () => {
    const tick = ok();
    const polling = startChangesPolling(tick, normal, pageOf().env);

    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS - 1);
    expect(tick).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(2);
    polling.stop();
  });

  it('reads 5 then every 10 s while a long read runs, and slows down once it ends', async () => {
    let cadence: ChangesCadence = 'fast';
    const tick = ok();
    const polling = startChangesPolling(tick, () => cadence, pageOf().env);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(tick).toHaveBeenCalledTimes(3);

    cadence = 'normal';
    await vi.advanceTimersByTimeAsync(10_000);
    expect(tick).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS - 1);
    expect(tick).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(5);
    polling.stop();
  });

  it('pauses while the tab is hidden, and reads once right when it is shown or focused', async () => {
    const tick = ok();
    const page = pageOf();
    const polling = startChangesPolling(tick, normal, page.env);

    page.hide();
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 10);
    expect(tick).not.toHaveBeenCalled();
    page.show();
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);

    // A focus right after a read reads nothing more; a later one reads at once.
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(3);
    polling.stop();
  });

  it('waits for a tab opened hidden to be shown', async () => {
    const tick = ok();
    const page = pageOf('hidden');
    const polling = startChangesPolling(tick, normal, page.env);

    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 3);
    expect(tick).not.toHaveBeenCalled();
    page.show();
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);
    polling.stop();
  });

  it('backs off to a minute once the user is idle, and comes back to 30 s at their next move', async () => {
    const tick = ok();
    const page = pageOf();
    const polling = startChangesPolling(tick, normal, page.env);

    await vi.advanceTimersByTimeAsync(CHANGES_IDLE_AFTER_MS);
    const atIdle = tick.mock.calls.length;
    expect(atIdle).toBe(CHANGES_IDLE_AFTER_MS / CHANGES_POLL_MS);

    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(atIdle);
    await vi.advanceTimersByTimeAsync(CHANGES_IDLE_POLL_MS - CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(atIdle + 1);

    page.move();
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(atIdle + 2);
    polling.stop();
  });

  it('reads at once when asked, never two reads at a time, and goes on at the pace after', async () => {
    let finish: (tick: ChangesTick) => void = () => undefined;
    const tick = vi.fn(() => new Promise<ChangesTick>((resolve) => (finish = resolve)));
    const polling = startChangesPolling(tick, normal, pageOf().env);

    polling.readNow();
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(1);
    // Asked again while it reads: one more read right after, not two at once.
    polling.readNow();
    polling.readNow();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(tick).toHaveBeenCalledTimes(1);
    finish('ok');
    await vi.advanceTimersByTimeAsync(0);
    expect(tick).toHaveBeenCalledTimes(2);
    finish('ok');
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(3);
    polling.stop();
  });

  it('backs off on failed reads, doubling, then keeps its pace after one that worked', async () => {
    const tick = vi
      .fn<() => Promise<ChangesTick>>()
      .mockResolvedValueOnce('failed')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue('ok');
    const polling = startChangesPolling(tick, normal, pageOf().env);

    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 2);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 4 - 1);
    expect(tick).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(tick).toHaveBeenCalledTimes(3);
    // 3.5 minutes with no move by now: the pace after a read that worked is the idle one, no longer doubled.
    await vi.advanceTimersByTimeAsync(CHANGES_IDLE_POLL_MS);
    expect(tick).toHaveBeenCalledTimes(4);
    polling.stop();
  });

  it('ends when told to stop, and reads nothing more once stopped', async () => {
    const tick = vi.fn(async (): Promise<ChangesTick> => 'stop');
    const page = pageOf();
    startChangesPolling(tick, normal, page.env);

    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 5);
    expect(tick).toHaveBeenCalledTimes(1);
    page.hide();
    page.show();
    page.focus();
    await vi.advanceTimersByTimeAsync(CHANGES_POLL_MS * 3);
    expect(tick).toHaveBeenCalledTimes(1);
  });
});

describe('what a read does', () => {
  it('takes a page read’s version unless it is older in both parts', () => {
    expect(takesVersion('4.2', null)).toBe(true);
    expect(takesVersion('5.2', '4.2')).toBe(true);
    expect(takesVersion('4.3', '4.2')).toBe(true);
    expect(takesVersion('4.2', '4.2')).toBe(false);
    expect(takesVersion('3.2', '4.2')).toBe(false);
    expect(takesVersion(null, '4.2')).toBe(false);
    expect(takesVersion('junk', '4.2')).toBe(false);
  });

  it.each([
    ['/contribute', ['ATTEMPTS'], true],
    ['/contribute', ['FEED'], true],
    ['/contribute/', ['SETTINGS'], true],
    ['/contribute/connect', ['FEED'], true],
    ['/contribute/issues', ['FEED'], true],
    ['/contribute/issues', ['ATTEMPTS'], false],
    ['/contribute/me', ['ATTEMPTS'], true],
    ['/contribute/me', ['SET', 'FEED'], false],
    ['/contribute/attempts/A_1', ['ATTEMPTS'], true],
    ['/contribute/settings/budget', ['SETTINGS'], true],
    ['/contribute/settings', ['ATTEMPTS'], false],
    ['/contribute/maintainers', ['SETTINGS', 'SET'], false],
  ] as const)('%s reads itself again for %j: %s', (path, changed, refresh) => {
    expect(refreshesFor(path, changed)).toBe(refresh);
  });

  it('never reads a page again for an issue’s availability or the work alone: those parts ask themselves', () => {
    for (const path of ['/contribute', '/contribute/issues', '/contribute/me', '/contribute/settings']) {
      expect(refreshesFor(path, ['ISSUES', 'ACTIVITY'])).toBe(false);
    }
  });

  it('reads the bar while something runs, and a wait only every five minutes', () => {
    const waiting = activityOf(item('FIRST_READS_WAITING'));
    expect(readsActivity({ activity: null, running: true, waitingReadDue: false })).toBe(true);
    expect(readsActivity({ activity: waiting, running: false, waitingReadDue: false })).toBe(false);
    expect(readsActivity({ activity: waiting, running: false, waitingReadDue: true })).toBe(true);
    expect(readsActivity({ activity: activityOf(), running: false, waitingReadDue: true })).toBe(false);
    expect(ACTIVITY_WAITING_READ_MS).toBe(5 * 60_000);
  });

  it('nothing moved: the version is kept, the page is not read again', () => {
    const held = heldOf('4.2', null, 0);
    const step = afterChangesRead(
      held,
      { changes: { version: '4.2', activity: false, changed: [] } },
      '/contribute',
      1,
    );

    expect(step).toEqual({ held: { ...held, version: '4.2' }, refresh: false });
  });

  it('an attempt moved: the overview reads itself again, the version moves on', () => {
    const step = afterChangesRead(
      heldOf('4.2', null, 0),
      { changes: { version: '5.2', activity: false, changed: ['ATTEMPTS'] } },
      '/contribute',
      1,
    );

    expect(step.refresh).toBe(true);
    expect(step.held.version).toBe('5.2');
  });

  it('the work moved on: the page reads itself again, and a running item keeps the pace though the flag lags', () => {
    const before = activityOf(item('FIRST_READS', 0));
    const after = activityOf(item('FIRST_READS', 1));
    const held = heldOf('4.2', before, 0);

    const moved = afterChangesRead(
      held,
      { changes: { version: '4.2', activity: false, changed: [] }, activity: after },
      '/contribute/settings',
      9,
    );
    expect(moved.refresh).toBe(true);
    expect(moved.held).toMatchObject({ activity: after, running: true, activityReadAt: 9 });

    const same = afterChangesRead(
      moved.held,
      { changes: { version: '4.2', activity: true, changed: [] }, activity: after },
      '/contribute/settings',
      10,
    );
    expect(same.refresh).toBe(false);

    const ended = afterChangesRead(
      same.held,
      { changes: { version: '5.2', activity: false, changed: ['ACTIVITY'] }, activity: activityOf() },
      '/contribute/me',
      11,
    );
    expect(ended).toMatchObject({ refresh: true, held: { running: false } });
  });

  it('the first work seen reads nothing again: there was none before to have moved', () => {
    const step = afterChangesRead(
      heldOf('4.2', null, 0),
      { changes: { version: '5.2', activity: true, changed: ['SET'] }, activity: activityOf(item('STACK_RESOLVE')) },
      '/contribute/me',
      1,
    );
    expect(step).toMatchObject({ refresh: false, held: { running: true } });
  });
});

describe('the bus between the poll and the page', () => {
  it('tells its listeners what moved, and nothing when nothing did', () => {
    const heard = vi.fn();
    const stop = onContributeChanges(heard);

    emitContributeChanges([]);
    emitContributeChanges(['ISSUES']);
    stop();
    emitContributeChanges(['ATTEMPTS']);
    expect(heard.mock.calls).toEqual([[['ISSUES']]]);
  });

  it('holds the poll fast while a page waits, waking it, and releases once', () => {
    const wake = vi.fn();
    expect(changesPollRunning()).toBe(false);
    setChangesWake(wake);
    expect(changesPollRunning()).toBe(true);

    const release = holdFastChanges();
    const other = holdFastChanges();
    expect(wake).toHaveBeenCalledTimes(2);
    expect(fastChangesHeld()).toBe(true);
    release();
    release();
    expect(fastChangesHeld()).toBe(true);
    other();
    expect(fastChangesHeld()).toBe(false);
    setChangesWake(null);
  });
});
