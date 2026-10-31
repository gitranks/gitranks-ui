import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QUEUED, READY, WORKING } from './__fixtures__/agent-runs';
import {
  changesPollRunning,
  clearChangesWake,
  emitContributeChanges,
  fastChangesHeld,
  holdFastChanges,
  onContributeChanges,
  setChangesWake,
} from './changes-bus';
import {
  ACTIVITY_RUNS_READ_MS,
  ACTIVITY_WAITING_READ_MS,
  ANNOUNCE_MS,
  afterChangesRead,
  CHANGES_BACKOFF_MAX_MS,
  CHANGES_FAST_MS,
  CHANGES_IDLE_AFTER_MS,
  CHANGES_IDLE_POLL_MS,
  CHANGES_POLL_MS,
  type ChangesCadence,
  type ChangesTick,
  changesDelayOf,
  createChangesSession,
  heldOf,
  readsActivity,
  refreshesFor,
  runningOf,
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
const activityOf = (...items: ContributeActivityItem[]): ContributeActivity => ({ items, runs: [], readAt: AT });

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
    ['/contribute/issues', ['ATTEMPTS'], true],
    ['/contribute/issues', ['ISSUES'], false],
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
    expect(readsActivity({ activity: null, running: true, waitingReadDue: false, runsReadDue: false })).toBe(true);
    expect(readsActivity({ activity: waiting, running: false, waitingReadDue: false, runsReadDue: false })).toBe(false);
    expect(readsActivity({ activity: waiting, running: false, waitingReadDue: true, runsReadDue: false })).toBe(true);
    expect(readsActivity({ activity: activityOf(), running: false, waitingReadDue: true, runsReadDue: false })).toBe(
      false,
    );
    expect(ACTIVITY_WAITING_READ_MS).toBe(5 * 60_000);
  });

  it('goes fast while an agent works on a run, reads a settled one every minute, an unsettled wait every five', () => {
    const working = { ...activityOf(), runs: [WORKING] };
    const settled = { ...activityOf(), runs: [QUEUED, READY] };
    const queued = { ...activityOf(), runs: [QUEUED] };
    expect(runningOf(working)).toBe(true);
    expect(runningOf(settled)).toBe(false);
    const reads = (activity: ContributeActivity, runsReadDue: boolean, waitingReadDue = false) =>
      readsActivity({ activity, running: false, waitingReadDue, runsReadDue });
    expect(reads(settled, false)).toBe(false);
    expect(reads(settled, true)).toBe(true);
    // A queued run moves only with a state the API names: the minute's look is not for it.
    expect(reads(queued, true)).toBe(false);
    expect(reads(queued, true, true)).toBe(true);
    expect(reads(activityOf(), true, true)).toBe(false);
    expect(ACTIVITY_RUNS_READ_MS).toBe(60_000);
  });

  it('keeps the page’s newer work over a read that began before it', () => {
    const page = { ...activityOf(), runs: [READY], readAt: '2026-10-31T12:00:10.000Z' };
    const held = heldOf('4.2', page, 0);
    const older = { ...activityOf(), runs: [WORKING], readAt: '2026-10-31T12:00:00.000Z' };
    const step = afterChangesRead(
      held,
      { changes: { version: '4.2', activity: true, changed: [] }, activity: older },
      '/contribute',
      1,
    );
    expect(step.tookActivity).toBe(false);
    expect(step.held.activity).toBe(page);
    const newer = { ...older, readAt: '2026-10-31T12:00:20.000Z' };
    const next = afterChangesRead(
      held,
      { changes: { version: '4.3', activity: true, changed: [] }, activity: newer },
      '/contribute',
      2,
    );
    expect(next.tookActivity).toBe(true);
    expect(next.held.activity).toBe(newer);
  });

  it('nothing moved: the version is kept, the page is not read again', () => {
    const held = heldOf('4.2', null, 0);
    const step = afterChangesRead(
      held,
      { changes: { version: '4.2', activity: false, changed: [] } },
      '/contribute',
      1,
    );

    expect(step).toEqual({ held: { ...held, version: '4.2' }, moved: false, changed: false, tookActivity: false });
  });

  it('an attempt moved: the overview reads itself again, the version moves on', () => {
    const step = afterChangesRead(
      heldOf('4.2', null, 0),
      { changes: { version: '5.2', activity: false, changed: ['ATTEMPTS'] } },
      '/contribute',
      1,
    );

    expect(step).toMatchObject({ moved: false, changed: true, held: { version: '5.2' } });
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
    expect(moved).toMatchObject({ moved: true, changed: false });
    expect(moved.held).toMatchObject({ activity: after, running: true, activityReadAt: 9 });

    const same = afterChangesRead(
      moved.held,
      { changes: { version: '4.2', activity: true, changed: [] }, activity: after },
      '/contribute/settings',
      10,
    );
    expect(same).toMatchObject({ moved: false, changed: false });

    const ended = afterChangesRead(
      same.held,
      { changes: { version: '5.2', activity: false, changed: ['ACTIVITY'] }, activity: activityOf() },
      '/contribute/me',
      11,
    );
    expect(ended).toMatchObject({ moved: true, changed: false, held: { running: false } });
  });

  it('the first work seen reads nothing again: there was none before to have moved', () => {
    const step = afterChangesRead(
      heldOf('4.2', null, 0),
      { changes: { version: '5.2', activity: true, changed: ['SET'] }, activity: activityOf(item('STACK_RESOLVE')) },
      '/contribute/me',
      1,
    );
    expect(step).toMatchObject({ moved: false, changed: false, held: { running: true } });
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
    clearChangesWake(() => undefined);
    expect(changesPollRunning()).toBe(true);
    clearChangesWake(wake);
    expect(changesPollRunning()).toBe(false);
  });
});

describe('the poll session', () => {
  type Read = Awaited<ReturnType<Parameters<typeof createChangesSession>[2]['read']>>;
  const answer = (version: string, changed: string[] = [], extra: Record<string, unknown> = {}): Read => ({
    ok: true,
    data: { changes: { version, activity: false, changed: changed as never }, ...extra },
  });
  const sessionOf = (reads: Read[], options: { path?: string; activity?: ContributeActivity | null } = {}) => {
    const deps = {
      read: vi.fn(async () => reads.shift() ?? answer('9.9')),
      refresh: vi.fn(),
      emit: vi.fn(),
      showActivity: vi.fn(),
      pathname: () => options.path ?? '/contribute',
      now: () => Date.now(),
    };
    return { session: createChangesSession('4.2', options.activity ?? null, deps), deps };
  };

  it('nothing moved: reads from the version held, refreshes nothing, tells the page nothing', async () => {
    const { session, deps } = sessionOf([answer('4.2')]);

    expect(await session.tick()).toBe('ok');
    expect(deps.read).toHaveBeenCalledWith('4.2', false);
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.emit).toHaveBeenCalledWith([]);
    expect(deps.showActivity).not.toHaveBeenCalled();
  });

  it('an attempt moved: the overview reads itself again once, and the next read starts from the new version', async () => {
    const { session, deps } = sessionOf([answer('5.2', ['ATTEMPTS', 'ISSUES']), answer('5.2')]);

    await session.tick();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(deps.emit).toHaveBeenCalledWith(['ATTEMPTS', 'ISSUES']);
    await session.tick();
    expect(deps.read).toHaveBeenLastCalledWith('5.2', false);
    expect(deps.refresh).toHaveBeenCalledTimes(1);
  });

  it('an issue’s availability alone refreshes no page: the cards hear it', async () => {
    const { session, deps } = sessionOf([answer('4.3', ['ISSUES'])], { path: '/contribute/issues' });

    await session.tick();
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.emit).toHaveBeenCalledWith(['ISSUES']);
  });

  it('a page read during a read, as new: kept, and what it already shows is not read again', async () => {
    const { session, deps } = sessionOf([]);
    let finish: (read: Read) => void = () => undefined;
    deps.read.mockImplementationOnce(() => new Promise<Read>((resolve) => (finish = resolve)));

    const tick = session.tick();
    // The user's own write and its page read land while the poll is out.
    expect(session.takePage('5.2', null)).toBe(false);
    finish(answer('5.2', ['SET']));
    await tick;
    expect(deps.refresh).not.toHaveBeenCalled();
    await session.tick();
    expect(deps.read).toHaveBeenLastCalledWith('5.2', false);
  });

  it('a page read during a read, older than its answer: the answer wins and refreshes', async () => {
    const { session, deps } = sessionOf([]);
    let finish: (read: Read) => void = () => undefined;
    deps.read.mockImplementationOnce(() => new Promise<Read>((resolve) => (finish = resolve)));

    const tick = session.tick();
    session.takePage('5.2', null);
    finish(answer('6.2', ['SET']));
    await tick;
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    await session.tick();
    expect(deps.read).toHaveBeenLastCalledWith('6.2', false);
  });

  it('a start of the user’s goes fast, reads the bar, and waits for their own page read', async () => {
    const { session, deps } = sessionOf([answer('5.2', [], { activity: activityOf(item('FIRST_READS')) })], {
      path: '/contribute/settings',
    });

    expect(session.cadence()).toBe('normal');
    session.announce();
    expect(session.cadence()).toBe('fast');
    // The page read that follows the write: the read waiting on it goes now.
    expect(session.takePage('5.2', null)).toBe(true);
    expect(session.announceWaited()).toBe(false);
    await session.tick();
    expect(deps.read).toHaveBeenCalledWith('5.2', true);
    // The page already shows the write; the first work seen moved nothing.
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.showActivity).toHaveBeenCalledWith(activityOf(item('FIRST_READS')));
    // A first read runs: fast past the announce too.
    vi.advanceTimersByTime(ANNOUNCE_MS);
    expect(session.cadence()).toBe('fast');
  });

  it('a start with no page read after it reads at the wait’s end', () => {
    const { session } = sessionOf([]);
    session.announce();
    expect(session.announceWaited()).toBe(true);
    expect(session.announceWaited()).toBe(false);
  });

  it('stops for a signed-out user or a hidden Contribute, backs off on anything else', async () => {
    const outcomes = await Promise.all(
      (
        [
          { ok: false, error: 'SIGNED_OUT' },
          { ok: false, error: 'NOT_FOUND' },
          { ok: true, data: null },
          { ok: false, error: 'NOT_AVAILABLE_YET' },
          { ok: false, error: 'FAILED' },
        ] as Read[]
      ).map((read) => sessionOf([read]).session.tick()),
    );
    expect(outcomes).toEqual(['stop', 'stop', 'stop', 'failed', 'failed']);
  });

  it('does nothing with a read that lands after it stopped', async () => {
    const { session, deps } = sessionOf([]);
    let finish: (read: Read) => void = () => undefined;
    deps.read.mockImplementationOnce(() => new Promise<Read>((resolve) => (finish = resolve)));

    const tick = session.tick();
    session.stop();
    finish(answer('5.2', ['ATTEMPTS']));
    expect(await tick).toBe('stop');
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.emit).not.toHaveBeenCalled();
  });

  it('takes a newer page read’s work in progress, and holds the pace for a running item', () => {
    const { session, deps } = sessionOf([]);
    const running = { ...activityOf(item('STACK_RESOLVE')), readAt: '2026-10-31T21:05:00.000Z' };

    session.takePage('4.2', running);
    expect(deps.showActivity).toHaveBeenCalledWith(running);
    expect(session.cadence()).toBe('fast');
    session.takePage('4.2', activityOf());
    expect(deps.showActivity).toHaveBeenCalledTimes(1);
  });
});
