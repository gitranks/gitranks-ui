// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateDailyButton } from './update-daily-button';
import type { DailyUpdatesPick, DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { DailyUpdatesFacts } from '@/utils/daily-updates-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const SIGNED_IN = { data: { user: { githubLogin: 'Mona-Dev', authMode: 'identity' } }, status: 'authenticated' };

const picked = (...names: string[]): DailyUpdatesPick[] =>
  names.map((nameWithOwner) => ({ nameWithOwner, pickedAt: iso(NOW - HOUR) }));
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
const bodies = (key: string) =>
  fetchMock.mock.calls
    .filter(([url, init]) => `${init?.method ?? 'GET'} ${url}` === key)
    .map(([, init]) => JSON.parse(String(init?.body)));

const text = () =>
  [...(document.body.firstElementChild?.querySelectorAll('button, div.text-xs') ?? [])]
    .map((element) => element.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const dialog = () => document.querySelector('[role="dialog"]');
const dialogText = () => dialog()?.textContent?.replace(/\s+/g, ' ') ?? null;
const buttonNamed = (name: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;

describe('UpdateDailyButton', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async (dailyUpdates: DailyUpdatesFacts = null) => {
    await act(async () => {
      root.render(<UpdateDailyButton owner="acme" name="fastqueue" dailyUpdates={dailyUpdates} />);
    });
    await act(async () => {});
  };

  const press = async (name: string, scope?: ParentNode) => {
    const element = buttonNamed(name, scope);
    expect(element, name).toBeDefined();
    await act(async () => element?.click());
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    answers = {};
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    for (const fn of Object.values(toast)) fn.mockReset();
    session.current = SIGNED_IN;
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

  it('shows nothing new signed out, and reads nothing', async () => {
    session.current = { data: null, status: 'unauthenticated' };
    await mount();

    expect(container.innerHTML).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows nothing new while the API keeps daily updates closed to the visitor, or the read fails', async () => {
    answer('GET /api/daily-updates', viewerOf({ open: false, state: 'never' }));
    await mount();
    expect(container.innerHTML).toBe('');

    answers = {};
    answer('GET /api/daily-updates', { message: 'Not Found' }, 404);
    await mount(null);
    expect(container.innerHTML).toBe('');
  });

  it('reads the state after load, with no-store', async () => {
    answer('GET /api/daily-updates', viewerOf());
    await mount();

    expect(fetchMock.mock.calls[0]).toEqual(['/api/daily-updates', { cache: 'no-store' }]);
  });

  it('says only that a repository someone picked updates daily, to everyone', async () => {
    session.current = { data: null, status: 'unauthenticated' };
    await mount({ reasons: [DailyUpdateReason.Pick], nextUpdateAt: iso(NOW + 5 * HOUR) });
    expect(container.textContent).toBe('Updates daily. Next update in 5 h.');

    session.current = SIGNED_IN;
    answer('GET /api/daily-updates', viewerOf({ picks: picked('octo/rocket') }));
    await mount({ reasons: [DailyUpdateReason.Pick], nextUpdateAt: iso(NOW + 5 * HOUR) });
    expect(container.textContent).toBe('Updates daily. Next update in 5 h.');
  });

  it('picks the repository with one press', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount();
    expect(text()).toBe('Update daily Uses 1 of your 3 picks.');

    answer('POST /api/daily-updates/picks', {
      status: 'picked',
      picks: picked('acme/fastqueue'),
      newPicksLeftToday: 2,
    });
    await press('Update daily');

    expect(bodies('POST /api/daily-updates/picks')).toEqual([{ owner: 'acme', name: 'fastqueue' }]);
    expect(text()).toBe('Updates daily Your pick.');
  });

  it('lists the visitor’s daily updates on their pick, and removes one', async () => {
    answer('GET /api/daily-updates', viewerOf({ picks: picked('ACME/fastqueue', 'octo/rocket') }));
    await mount({ reasons: [DailyUpdateReason.Pick], nextUpdateAt: iso(NOW + 5 * HOUR) });
    expect(text()).toBe('Updates daily Your pick. Next update in 5 h.');

    await press('Updates daily');
    expect(dialogText()).toContain('Your daily updates');
    expect(dialogText()).toContain('We update these every day. They stay on for 7 days after your last visit.');
    expect(dialogText()).toContain('Mona-DevYour profile');
    expect(dialogText()).toContain('1 pick left');
    expect(dialogText()).toContain('You can add 3 picks a day.');

    answer('DELETE /api/daily-updates/picks', { status: 'removed', picks: picked('ACME/fastqueue') });
    const rocket = [...(dialog()?.querySelectorAll('li') ?? [])].find((row) =>
      row.textContent?.includes('octo/rocket'),
    );
    await press('Remove', rocket);

    expect(bodies('DELETE /api/daily-updates/picks')).toEqual([{ owner: 'octo', name: 'rocket' }]);
    expect(dialogText()).not.toContain('octo/rocket');
    expect(dialogText()).toContain('2 picks left');

    await press('Done');
    expect(dialog()).toBeNull();
  });

  it('asks to remove one when all 3 are used, then "Done" picks this repository', async () => {
    answer('GET /api/daily-updates', viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas') }));
    await mount();

    answer('POST /api/daily-updates/picks', { status: 'full' });
    await press('Update daily');
    expect(dialogText()).toContain('All 3 picks are used');
    expect(dialogText()).toContain('Remove one to update acme/fastqueue every day.');
    expect(dialogText()).not.toContain('Your profile');

    answer('DELETE /api/daily-updates/picks', { status: 'removed', picks: picked('octo/rocket', 'octo/lantern') });
    const atlas = [...(dialog()?.querySelectorAll('li') ?? [])].find((row) => row.textContent?.includes('quiet/atlas'));
    await press('Remove', atlas);

    answer('POST /api/daily-updates/picks', {
      status: 'picked',
      picks: picked('octo/rocket', 'octo/lantern', 'acme/fastqueue'),
      newPicksLeftToday: 1,
    });
    await press('Done');

    expect(bodies('POST /api/daily-updates/picks')).toHaveLength(2);
    expect(dialog()).toBeNull();
    expect(text()).toBe('Updates daily Your pick.');
  });

  it('"Cancel" with all 3 picks used picks nothing', async () => {
    answer('GET /api/daily-updates', viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas') }));
    await mount();
    answer('POST /api/daily-updates/picks', { status: 'full' });
    await press('Update daily');

    await press('Cancel');

    expect(dialog()).toBeNull();
    expect(bodies('POST /api/daily-updates/picks')).toHaveLength(1);
  });

  it('says when the next new pick opens after 3 new picks today', async () => {
    answer('GET /api/daily-updates', viewerOf({ picks: picked('octo/rocket'), newPicksLeftToday: 0 }));
    await mount();

    answer('POST /api/daily-updates/picks', { status: 'daily_limit', nextAt: iso(NOW + 12 * HOUR) });
    await press('Update daily');

    expect(dialogText()).toContain('No new picks left today');
    expect(dialogText()).toContain('You can add 3 picks a day. The next one opens in 12 h.');
  });

  it('asks for the star, and "I starred it, pick" asks again', async () => {
    answer('GET /api/daily-updates', viewerOf({ state: 'never' }));
    await mount();

    answer('POST /api/daily-updates/picks', { status: 'not_starred' });
    await press('Update daily');
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('Picks cost 1 star ⭐');

    answer('POST /api/daily-updates/picks', { status: 'blocked', until: iso(NOW + HOUR) });
    await press('I starred it, pick');
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe('Our robot needs a break 🥱');
    expect(dialogText()).toContain('Try again in 1 h.');
  });

  it('says so when the repository cannot be picked, and hides the button once daily updates closed', async () => {
    answer('GET /api/daily-updates', viewerOf());
    await mount();

    answer('POST /api/daily-updates/picks', { status: 'not_held' });
    await press('Update daily');
    expect(toast.info).toHaveBeenCalledExactlyOnceWith('This repository can’t be updated daily right now.');

    answer('POST /api/daily-updates/picks', { message: 'Forbidden' }, 403);
    await press('Update daily');
    expect(container.innerHTML).toBe('');
  });
});
