// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchUserButtonForProfilePage } from './fetch-user-button';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { DailyUpdatesFacts } from '@/utils/daily-updates-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ login: 'octo-dev' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlClient: vi.fn(async () => ({ user: { fetchingStatus: 'FETCHING' } })),
}));

const OWNER = { data: { user: { githubLogin: 'Octo-Dev', authMode: 'identity' } }, status: 'authenticated' };
const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

const viewerOf = (overrides: Partial<DailyUpdatesViewer> = {}): DailyUpdatesViewer => ({
  open: true,
  state: 'on',
  until: iso(NOW + 7 * 24 * HOUR),
  manual: { available: true, nextAt: null },
  picks: [],
  newPicksLeftToday: 3,
  ...overrides,
});
const USED = { available: false, nextAt: iso(NOW + 23 * HOUR + 10 * 60_000) };

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
const calls = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);

// The button and its line, as a reader hears them: one after the other.
const text = () =>
  [...(document.body.firstElementChild?.firstElementChild?.children ?? [])]
    .map((element) => element.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const buttonNamed = (name: string) =>
  [...document.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;
const dialogTitle = () => document.querySelector('[role="dialog"] h2')?.textContent ?? null;

describe("the owner's daily updates on their own profile", () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async (dailyUpdates: DailyUpdatesFacts = null) => {
    await act(async () => {
      root.render(<FetchUserButtonForProfilePage profileLogin="octo-dev" dailyUpdates={dailyUpdates} />);
    });
    // The reads answer after load.
    await act(async () => {});
  };

  const press = async (name: string) => {
    const element = buttonNamed(name);
    expect(element, name).toBeDefined();
    await act(async () => element?.click());
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    answers = {};
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    for (const fn of [toast.success, toast.error, toast.info]) fn.mockReset();
    session.current = OWNER;
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

  it("shows today's button when daily updates are closed to the owner, and reads the daily refresh as before", async () => {
    answer(
      'GET /api/daily-updates',
      viewerOf({ open: false, state: 'never', manual: { available: false, nextAt: null } }),
    );
    answer('GET /api/daily-refresh', { available: true, nextAt: null });

    await mount({ reasons: [DailyUpdateReason.Badge], nextUpdateAt: iso(NOW + 5 * HOUR) });

    expect(text()).toBe('Refresh · 1 left');
    expect(calls()).toEqual(['GET /api/daily-updates', 'GET /api/daily-refresh']);
  });

  it("shows today's button when the read fails", async () => {
    answer('GET /api/daily-updates', { message: 'Not Found' }, 404);
    answer('GET /api/daily-refresh', { available: false, nextAt: iso(NOW + HOUR) });

    await mount();

    expect(text()).toBe('Refresh');
  });

  it('reads nothing for a visitor who is not signed in, or on someone else’s profile', async () => {
    session.current = { data: null, status: 'unauthenticated' };
    await mount();
    session.current = { data: { user: { githubLogin: 'someone', authMode: 'identity' } }, status: 'authenticated' };
    await mount();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(text()).toBe('Refresh');
  });

  it('starts daily updates: one press checks the star, refreshes now and says so', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount();
    expect(text()).toBe('Start daily updates Refreshes now, then every day for 7 days.');

    answer('POST /api/daily-updates', {
      status: 'started',
      until: iso(NOW + 7 * 24 * HOUR),
      refreshed: true,
      nextAt: iso(NOW + 24 * HOUR),
    });
    await press('Start daily updates');

    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({ login: 'octo-dev' });
    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      'Thanks for the star! Refreshing now. Daily updates are on for 7 days.',
    );
    expect(text()).toMatch(/^Fetching…/);
    expect(calls()).not.toContain('GET /api/daily-refresh');
  });

  it('starts without a fetch when today’s manual refresh is used, and then has nothing to press for', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'lapsed', manual: USED }));
    await mount();

    answer('POST /api/daily-updates', {
      status: 'started',
      until: iso(NOW + 7 * 24 * HOUR),
      refreshed: false,
      nextAt: USED.nextAt,
    });
    await press('Start daily updates');

    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Thanks for the star! Daily updates are on for 7 days.');
    expect(text()).toBe('Daily updates on Next update in 23 h 10 min.');
  });

  it('asks for the star, and "I starred it" starts again', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount();

    answer('POST /api/daily-updates', { status: 'not_starred' });
    await press('Start daily updates');
    expect(dialogTitle()).toBe('Your refresh costs 1 star ⭐');

    answer('POST /api/daily-updates', { status: 'busy' });
    await press('I starred it, refresh');
    expect(calls().filter((call) => call === 'POST /api/daily-updates')).toHaveLength(2);
    expect(toast.info).toHaveBeenCalledOnce();
  });

  it("shows today's button again when daily updates closed since the read", async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount();

    answer('POST /api/daily-updates', { message: 'Forbidden' }, 403);
    await press('Start daily updates');

    expect(text()).toBe('Refresh');
  });

  it('offers "Refresh now" while on, with the next update from the page', async () => {
    answer('GET /api/daily-updates', viewerOf());
    await mount({ reasons: [DailyUpdateReason.Owner], nextUpdateAt: iso(NOW + 5 * HOUR) });

    expect(text()).toBe('Refresh now Daily updates on. Next update in 5 h.');

    answer('POST /api/daily-refresh', { status: 'used', nextAt: USED.nextAt });
    await press('Refresh now');
    expect(dialogTitle()).toBe('Next update in 23 h 10 min');
  });

  it('says when the next update is once the manual refresh is used', async () => {
    answer('GET /api/daily-updates', viewerOf({ manual: USED }));
    await mount({ reasons: [DailyUpdateReason.Owner], nextUpdateAt: iso(NOW + 2 * HOUR) });

    expect(text()).toBe('Daily updates on Next update in 23 h 10 min.');
    await press('Daily updates on');
    expect(dialogTitle()).toBe('Next update in 23 h 10 min');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Today’s manual refresh is used.');
  });

  it('offers no manual refresh while the badge alone keeps the profile on', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount({ reasons: [DailyUpdateReason.Badge], nextUpdateAt: iso(NOW + 5 * HOUR) });

    expect(text()).toBe('Daily updates on Your badge on GitHub keeps this on. Next update in 5 h.');
    await press('Daily updates on');
    expect(dialogTitle()).toBe('Your badge keeps this on');

    answer('POST /api/daily-updates', { status: 'blocked', until: iso(NOW + HOUR) });
    await press('Start daily updates');
    expect(dialogTitle()).toBe('Our robot needs a break 🥱');
  });
});
