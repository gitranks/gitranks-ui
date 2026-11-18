// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PackageUpdatesButton } from './package-updates-button';
import type { DailyUpdatesPick, DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast, signIn } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  signIn: vi.fn(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const SIGNED_OUT = { data: null, status: 'unauthenticated' };
const SIGNED_IN = { data: { user: { githubLogin: 'mona', authMode: 'identity' } }, status: 'authenticated' };
const NOW = Date.parse('2026-11-17T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

const VIEWER = 'GET /api/daily-updates';
const PICKS = 'POST /api/daily-updates/picks';
const REFRESH = 'POST /api/packages/npm/left-pad/refresh';
const STATUS = 'GET /api/packages/npm/left-pad/refresh';
const MARK = 'daily-updates-deal';

const picked = (...names: string[]): DailyUpdatesPick[] =>
  names.map((name) => ({ kind: 'package', name, pickedAt: iso(NOW - HOUR) }));
const viewerOf = (overrides: Partial<DailyUpdatesViewer> = {}): DailyUpdatesViewer => ({
  open: true,
  state: 'on',
  until: iso(NOW + 7 * 24 * HOUR),
  manual: { available: true, nextAt: null },
  picks: [],
  newPicksLeftToday: 3,
  ...overrides,
});

type Answer = { status?: number; body: unknown };
let answers: Record<string, Answer[]>;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const key = `${init?.method ?? 'GET'} ${url}`;
  const answer = answers[key]?.shift();
  if (!answer) {
    throw new Error(`unexpected ${key}`);
  }
  return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
});
const answer = (key: string, body: unknown, status?: number) => {
  answers[key] = [...(answers[key] ?? []), { body, status }];
};
const calls = (key: string) => fetchMock.mock.calls.filter(([url, init]) => `${init?.method ?? 'GET'} ${url}` === key);

/** The button and the line under it, as text. */
const text = () =>
  [...(document.body.firstElementChild?.querySelectorAll('button, div.text-xs') ?? [])]
    .map((element) => element.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const dialog = () => document.querySelector('[role="dialog"]');
const dialogTitle = () => dialog()?.querySelector('h2')?.textContent ?? null;
const dialogText = () => dialog()?.textContent?.replace(/\s+/g, ' ') ?? '';
const buttonNamed = (name: string) =>
  [...document.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;

describe('PackageUpdatesButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async (props: Partial<Parameters<typeof PackageUpdatesButton>[0]> = {}) => {
    await act(async () => {
      root.render(<PackageUpdatesButton name="left-pad" repository="stevemao/left-pad" {...props} />);
    });
    await act(async () => {});
    await act(async () => {});
  };

  const press = async (name: string) => {
    const element = buttonNamed(name);
    expect(element, name).toBeDefined();
    await act(async () => element?.click());
    await act(async () => {});
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: NOW });
    answers = {};
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    for (const fn of [toast.success, toast.error, toast.info, signIn]) fn.mockReset();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('off', () => {
    it('signed out: Refresh opens the deal, whose sign-in leaves the mark that adds the package on return', async () => {
      session.current = SIGNED_OUT;
      await mount();
      expect(text()).toBe('Refresh');

      await press('Refresh');
      expect(dialogTitle()).toBe('Hi, I’m Vitalii 👋');
      expect(dialogText()).toContain('Then we refresh left-pad now and every day for the next 7 days');
      expect(dialogText()).toContain('Add a GitRanks badge to the README of stevemao/left-pad.');

      await press('Sign in with GitHub');
      expect(signIn).toHaveBeenCalledOnce();
      expect(JSON.parse(sessionStorage.getItem(MARK) ?? '{}').page).toBe('package:npm/left-pad');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('signed in: "Update daily" adds it, and a refresh that starts is waited for', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf({ state: 'never' }));
      await mount();
      expect(text()).toBe('Update daily Update up to 3 repos or packages daily.');

      answer(PICKS, {
        status: 'picked',
        picks: picked('npm/left-pad'),
        newPicksLeftToday: 2,
        refresh: 'started',
      });
      await press('Update daily');

      expect(JSON.parse(String(calls(PICKS)[0][1]?.body))).toEqual({ kind: 'package', name: 'npm/left-pad' });
      expect(toast.success).toHaveBeenCalledWith('Refreshing now. This package is on daily updates.');
      expect(text()).toBe('Refreshing…');
    });

    it('signed in: a pick whose refresh waits says its first update comes soon', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf({ state: 'never' }));
      await mount();

      answer(PICKS, { status: 'picked', picks: picked('npm/left-pad'), newPicksLeftToday: 2, refresh: 'due' });
      await press('Update daily');

      expect(toast.success).toHaveBeenCalledWith('This package is on daily updates. Its first update comes soon.');
      expect(text()).toBe('Updates daily You added it.');
    });

    it('back from the deal’s sign-in, adds the package by itself', async () => {
      session.current = SIGNED_IN;
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'package:npm/left-pad', at: NOW - 60_000 }));
      answer(VIEWER, viewerOf({ state: 'never' }));
      answer(PICKS, { status: 'picked', picks: picked('npm/left-pad'), newPicksLeftToday: 2, refresh: 'fresh' });
      await mount();

      expect(calls(PICKS)).toHaveLength(1);
      expect(sessionStorage.getItem(MARK)).toBeNull();
    });

    it('the fourth one opens the full list, in words that name packages', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf({ state: 'never', picks: picked('npm/a', 'npm/b', 'npm/c') }));
      await mount();

      answer(PICKS, { status: 'full' });
      answer(VIEWER, viewerOf({ picks: picked('npm/a', 'npm/b', 'npm/c') }));
      await press('Update daily');

      expect(dialogTitle()).toBe('You update 3 repos and packages daily');
      expect(dialogText()).toContain('Repos and packages share these 3. Remove one to add left-pad.');
      expect(dialogText()).toContain('anpm package');
    });
  });

  describe('on daily updates', () => {
    const NEXT = iso(NOW + 5 * HOUR);

    it('your pick: the line and the list', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf({ picks: picked('npm/left-pad') }));
      await mount({ dailyUpdates: { reasons: [DailyUpdateReason.Pick], nextUpdateAt: NEXT } });

      expect(text()).toBe('Updates daily You added it. Next update in 5 h.');
      await press('Updates daily');
      expect(dialogTitle()).toBe('Your daily updates');
      expect(dialogText()).toContain('left-padnpm package');
      expect(dialogText()).toContain('You can add 2 more repos or packages.');
    });

    it('on a badge: why, and "Refresh now" for a signed-in visitor', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf());
      await mount({ dailyUpdates: { reasons: [DailyUpdateReason.Badge], nextUpdateAt: NEXT } });

      expect(text()).toBe(
        'Updates daily Updates daily: its repository has a GitRanks badge in its README. Next update in 5 h.',
      );
      await press('Updates daily');
      expect(dialogTitle()).toBe('This package updates every day');

      answer(REFRESH, { status: 'up_to_date' });
      await press('Refresh now');
      expect(calls(REFRESH)).toHaveLength(1);
      expect(toast.info).toHaveBeenCalledWith('It was refreshed less than an hour ago.');
    });

    it('on a pick of somebody: says only that it updates daily, and offers nothing to press signed out', async () => {
      session.current = SIGNED_OUT;
      await mount({ dailyUpdates: { reasons: [DailyUpdateReason.Pick], nextUpdateAt: NEXT } });

      expect(text()).toBe('Updates daily Updates daily. Next update in 5 h.');
      await press('Updates daily');
      expect(dialogTitle()).toBe('This package updates every day');
      expect(buttonNamed('Refresh now')).toBeUndefined();
    });
  });

  describe('waiting for a refresh', () => {
    const reload = vi.fn();
    const NOTE = 'repo-pull-note:package:npm/left-pad';
    const tick = async (ms: number) => {
      await act(async () => vi.advanceTimersByTime(ms));
      await act(async () => {});
    };

    beforeEach(() => {
      reload.mockReset();
      vi.stubGlobal('location', { ...window.location, reload });
    });

    it('watches one shown running at 10, 20 then 40 s, and reloads once it lands, with no note', async () => {
      session.current = SIGNED_OUT;
      await mount({ refreshRunning: true, dailyUpdates: { reasons: [], nextUpdateAt: null, lastUpdatedAt: null } });
      expect(text()).toBe('Refreshing…');

      answer(STATUS, { running: true, lastUpdatedAt: null, dependentsChecked: true });
      answer(STATUS, { running: true, lastUpdatedAt: null, dependentsChecked: true });
      await tick(10_000);
      expect(calls(STATUS)).toHaveLength(1);
      await tick(19_000);
      expect(calls(STATUS)).toHaveLength(1);
      await tick(1_000);
      expect(calls(STATUS)).toHaveLength(2);

      answer(STATUS, { running: false, lastUpdatedAt: iso(NOW), dependentsChecked: true });
      await tick(39_000);
      expect(reload).not.toHaveBeenCalled();
      await tick(1_000);
      expect(reload).toHaveBeenCalledOnce();
      expect(sessionStorage.getItem(NOTE)).toBeNull();
    });

    it('says nothing when one only watched takes long', async () => {
      session.current = SIGNED_OUT;
      await mount({ refreshRunning: true });
      for (let i = 0; i < 20; i++) answer(STATUS, { running: true, lastUpdatedAt: null, dependentsChecked: true });
      await tick(10_000);
      await tick(20_000);
      for (let i = 0; i < 16; i++) await tick(40_000);

      expect(toast.info).not.toHaveBeenCalled();
      expect(text()).toBe('Refresh');
    });

    it('a press that landed: reloads with the note; one whose update is older than the press: no “Updated”', async () => {
      session.current = SIGNED_IN;
      const yesterday = iso(NOW - 24 * HOUR);
      answer(VIEWER, viewerOf());
      await mount({ dailyUpdates: { reasons: [DailyUpdateReason.Badge], nextUpdateAt: null, lastUpdatedAt: null } });

      answer(REFRESH, { status: 'started', nextAt: iso(NOW + 24 * HOUR) });
      await press('Updates daily');
      await press('Refresh now');
      // A refresh that failed today: the row still names yesterday's update, which the cached page did not show.
      answer(STATUS, { running: false, lastUpdatedAt: yesterday, dependentsChecked: true });
      await tick(10_000);

      expect(reload).toHaveBeenCalledOnce();
      expect(sessionStorage.getItem(NOTE)).toBeNull();
    });

    it('reloads after a press with the partial note when the repositories were not all re-read', async () => {
      session.current = SIGNED_IN;
      answer(VIEWER, viewerOf());
      await mount({ dailyUpdates: { reasons: [DailyUpdateReason.Badge], nextUpdateAt: null, lastUpdatedAt: null } });

      answer(REFRESH, { status: 'started', nextAt: iso(NOW + 24 * HOUR) });
      await press('Updates daily');
      await press('Refresh now');
      answer(STATUS, { running: false, lastUpdatedAt: iso(NOW + 5_000), dependentsChecked: false });
      await tick(10_000);

      expect(reload).toHaveBeenCalledOnce();
      expect(JSON.parse(sessionStorage.getItem(NOTE) ?? '{}').note).toBe(
        'Downloads and releases are updated. The repositories that use it are re-read tomorrow.',
      );
    });

    it('aborts a check under way on unmount, and never reloads after it', async () => {
      session.current = SIGNED_OUT;
      let signal: AbortSignal | undefined;
      fetchMock.mockImplementationOnce(async (_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      });
      await mount({ refreshRunning: true });
      await tick(10_000);
      expect(signal?.aborted).toBe(false);

      act(() => root.unmount());
      expect(signal?.aborted).toBe(true);
      root = createRoot(container);
      await tick(60_000);
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
