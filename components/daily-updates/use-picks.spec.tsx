// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type PicksState, usePicks } from './use-picks';
import { PICK_TOASTS } from '@/app/repo/[owner]/[name]/utils/pick-messages';
import { REFRESH_TOASTS } from '@/components/refresh-dialogs/refresh-messages';
import type { DailyUpdatesPick, DailyUpdatesViewer, PickRef } from '@/types/daily-updates.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { toast, sendGAEvent } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  sendGAEvent: vi.fn(),
}));

vi.mock('@next/third-parties/google', () => ({ sendGAEvent }));
vi.mock('sonner', () => ({ toast }));

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const PICKS = '/api/daily-updates/picks';
const TARGET: PickRef = { kind: 'repo', name: 'acme/fastqueue' };

const picked = (...names: string[]): DailyUpdatesPick[] =>
  names.map((name) => ({ kind: 'repo', name, pickedAt: iso(NOW - HOUR) }));
const viewerOf = (overrides: Partial<DailyUpdatesViewer> = {}): DailyUpdatesViewer => ({
  open: true,
  state: 'on',
  until: iso(NOW + 7 * 24 * HOUR),
  manual: { available: true, nextAt: null },
  picks: [],
  newPicksLeftToday: 3,
  ...overrides,
});

describe('usePicks', () => {
  let container: HTMLDivElement;
  let root: Root;
  let state: PicksState;
  let viewer: DailyUpdatesViewer | null;
  let fresh: DailyUpdatesViewer | null;
  const fetchMock = vi.fn();
  const onPicked = vi.fn();
  const onCloseDialog = vi.fn();

  const Harness = ({ initial }: { initial: DailyUpdatesViewer | null }) => {
    const [current, setViewer] = useState(initial);
    // As the real read: a failed one keeps the state.
    const reload = async () => {
      if (fresh) setViewer(fresh);
      return fresh;
    };
    state = usePicks({ target: TARGET, viewer: current, setViewer, reload, onPicked, onCloseDialog });
    viewer = current;
    return null;
  };

  const mount = (initial: DailyUpdatesViewer | null = viewerOf()) =>
    act(() => root.render(<Harness initial={initial} />));
  const answer = (body: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  const sent = () => fetchMock.mock.calls.map(([url, init]) => [url, init.method, JSON.parse(init.body)]);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    for (const fn of [...Object.values(toast), sendGAEvent, onPicked, onCloseDialog]) fn.mockReset();
    fresh = null;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('lists the visitor’s picks by kind and name, and says whether one is left', () => {
    mount(viewerOf({ picks: picked('octo/rocket', 'octo/lantern') }));
    expect(state.picks).toEqual([
      { kind: 'repo', name: 'octo/rocket' },
      { kind: 'repo', name: 'octo/lantern' },
    ]);
    expect(state.hasPickLeft).toBe(true);

    act(() => root.unmount());
    root = createRoot(container);
    mount(viewerOf({ picks: picked('octo/rocket'), newPicksLeftToday: 0 }));
    expect(state.hasPickLeft).toBe(false);

    act(() => root.unmount());
    root = createRoot(container);
    mount(null);
    expect([state.picks, state.hasPickLeft]).toEqual([[], false]);
  });

  it('picks the target as `{ kind, name }`, takes the answer, starts daily updates, then runs `onPicked`', async () => {
    mount(viewerOf({ state: 'lapsed' }));
    answer({ status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });

    await act(() => state.pick());

    expect(sent()).toEqual([[PICKS, 'POST', { kind: 'repo', name: 'acme/fastqueue' }]]);
    expect(viewer).toMatchObject({ state: 'on', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });
    expect(onPicked).toHaveBeenCalledOnce();
    expect(onCloseDialog).toHaveBeenCalledOnce();
    expect(state.dialog).toBeNull();
  });

  it('keeps the state of a visitor who held the pick already', async () => {
    mount(viewerOf({ state: 'lapsed', picks: picked('ACME/FastQueue') }));
    answer({ status: 'picked', picks: picked('ACME/FastQueue'), newPicksLeftToday: 3 });

    await act(() => state.pick());

    expect(viewer?.state).toBe('lapsed');
  });

  it.each([
    ['full, a new pick left today', { status: 'full' }, viewerOf({ newPicksLeftToday: 1 }), { kind: 'allPicksUsed' }],
    [
      'full, no new pick left today',
      { status: 'full' },
      viewerOf({ newPicksLeftToday: 0 }),
      { kind: 'dailyLimit', until: '2026-11-16T00:00:00.000Z' },
    ],
    ['full, the read failed', { status: 'full' }, null, { kind: 'allPicksUsed' }],
    [
      'daily_limit',
      { status: 'daily_limit', nextAt: iso(NOW + 2 * HOUR) },
      null,
      { kind: 'dailyLimit', until: iso(NOW + 2 * HOUR) },
    ],
    ['not_starred', { status: 'not_starred' }, null, { kind: 'pick', pick: 'starStep' }],
    [
      'blocked',
      { status: 'blocked', until: iso(NOW + HOUR) },
      null,
      { kind: 'pick', pick: 'blocked', until: iso(NOW + HOUR) },
    ],
  ])('opens its dialog on %s, and picks nothing', async (_, body, reread, dialog) => {
    mount();
    fresh = reread;
    answer(body);

    await act(() => state.pick());

    expect(state.dialog).toEqual(dialog);
    const kind = dialog.kind === 'pick' ? (dialog as { pick: string }).pick : dialog.kind;
    expect(sendGAEvent).toHaveBeenCalledExactlyOnceWith('event', 'daily_updates_dialog_open', { kind });
    expect(onPicked).not.toHaveBeenCalled();

    act(() => state.closeDialog());
    expect(state.dialog).toBeNull();
  });

  it.each([
    ['not_held', { status: 'not_held' }, 200, 'info', PICK_TOASTS.notHeld],
    ['busy', { status: 'busy' }, 200, 'info', PICK_TOASTS.busy],
    ['a removed account (410)', { message: 'Gone' }, 410, 'error', REFRESH_TOASTS.removed],
    ['a name the API refuses (400)', { message: 'Bad' }, 400, 'error', PICK_TOASTS.notHeld],
    ['a failure', { message: 'Bad Gateway' }, 502, 'error', PICK_TOASTS.failed],
  ] as const)('toasts on %s, and picks nothing', async (_, body, status, tone, text) => {
    mount();
    answer(body, status);

    await act(() => state.pick());

    expect(toast[tone]).toHaveBeenCalledExactlyOnceWith(text);
    expect([state.dialog, state.picking]).toEqual([null, false]);
    expect(onPicked).not.toHaveBeenCalled();
  });

  it('toasts a call that throws', async () => {
    mount();
    fetchMock.mockRejectedValueOnce(new Error('offline'));

    await act(() => state.pick());

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(PICK_TOASTS.failed);
  });

  it('drops the viewer and closes every dialog when daily updates are closed to the visitor (403)', async () => {
    mount();
    answer({ message: 'Forbidden' }, 403);
    answer({ message: 'Forbidden' }, 403);

    await act(() => state.pick());
    expect(viewer).toBeNull();
    expect(onCloseDialog).toHaveBeenCalledTimes(2);

    act(() => root.unmount());
    root = createRoot(container);
    mount(viewerOf({ picks: picked('octo/rocket') }));
    onCloseDialog.mockReset();
    await act(() => state.remove({ kind: 'repo', name: 'octo/rocket' }));
    expect(viewer).toBeNull();
    expect(onCloseDialog).toHaveBeenCalledOnce();
    expect(onPicked).not.toHaveBeenCalled();
  });

  it('shows the press under way while it runs', async () => {
    mount();
    let settle: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (settle = resolve)));

    let pressed: Promise<void> = Promise.resolve();
    act(() => {
      pressed = state.pick();
    });
    expect(state.picking).toBe(true);

    await act(async () => {
      settle(new Response(JSON.stringify({ status: 'busy' })));
      await pressed;
    });
    expect(state.picking).toBe(false);
  });

  it('removes a pick as `{ kind, name }`, marks the target’s own removal here, in any letter case', async () => {
    mount(viewerOf({ picks: picked('octo/rocket', 'Acme/FastQueue') }));
    answer({ status: 'removed', picks: picked('Acme/FastQueue') });
    answer({ status: 'removed', picks: [] });

    await act(() => state.remove({ kind: 'repo', name: 'octo/rocket' }));
    expect(viewer?.picks).toEqual(picked('Acme/FastQueue'));
    expect(state.removedHere).toBe(false);

    await act(() => state.remove({ kind: 'repo', name: 'Acme/FastQueue' }));
    expect(viewer?.picks).toEqual([]);
    expect(state.removedHere).toBe(true);
    expect(sent()).toEqual([
      [PICKS, 'DELETE', { kind: 'repo', name: 'octo/rocket' }],
      [PICKS, 'DELETE', { kind: 'repo', name: 'Acme/FastQueue' }],
    ]);
    expect(state.removing).toBeNull();
  });

  it('a pick after a removal here clears the mark', async () => {
    mount(viewerOf({ picks: picked('acme/fastqueue') }));
    answer({ status: 'removed', picks: [] });
    answer({ status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });

    await act(() => state.remove(TARGET));
    expect(state.removedHere).toBe(true);
    await act(() => state.pick());
    expect(state.removedHere).toBe(false);
  });

  it('holds the pick under removal while it runs', async () => {
    mount(viewerOf({ picks: picked('octo/rocket') }));
    let settle: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (settle = resolve)));

    let pressed: Promise<void> = Promise.resolve();
    act(() => {
      pressed = state.remove({ kind: 'repo', name: 'octo/rocket' });
    });
    expect(state.removing).toEqual({ kind: 'repo', name: 'octo/rocket' });

    await act(async () => {
      settle(new Response(JSON.stringify({ message: 'Bad Gateway' }), { status: 502 }));
      await pressed;
    });
    expect(state.removing).toBeNull();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(PICK_TOASTS.removeFailed);
  });

  it.each([
    [410, REFRESH_TOASTS.removed],
    [400, PICK_TOASTS.notHeld],
  ])('toasts a refused removal (%i)', async (status, text) => {
    mount(viewerOf({ picks: picked('octo/rocket') }));
    answer({ message: 'No' }, status);

    await act(() => state.remove({ kind: 'repo', name: 'octo/rocket' }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(text);
    expect(viewer?.picks).toEqual(picked('octo/rocket'));
  });
});
