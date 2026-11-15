// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchUserButtonForProfilePage } from './fetch-user-button';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast, signIn } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  signIn: vi.fn(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn }));
vi.mock('next/navigation', () => ({ useParams: () => ({ login: 'octo-dev' }), useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlClient: vi.fn(async () => ({ user: { fetchingStatus: 'FETCHING' } })),
}));

const SIGNED_OUT = { data: null, status: 'unauthenticated' };
const OWNER = { data: { user: { githubLogin: 'Octo-Dev', authMode: 'identity' } }, status: 'authenticated' };
const SOMEONE = { data: { user: { githubLogin: 'mona', authMode: 'identity' } }, status: 'authenticated' };
const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const MARK = 'daily-updates-deal';

const viewerOf = (overrides: Partial<DailyUpdatesViewer> = {}): DailyUpdatesViewer => ({
  open: true,
  state: 'never',
  until: null,
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
const calls = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? 'GET'} ${url}`);
const bodies = (key: string) =>
  fetchMock.mock.calls
    .filter(([url, init]) => `${init?.method ?? 'GET'} ${url}` === key)
    .map(([, init]) => JSON.parse(String(init?.body)));

const elementNamed = (name: string) =>
  [...document.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;
const dialogTitle = () => document.querySelector('[role="dialog"] h2')?.textContent ?? null;
const dialogText = () => document.querySelector('[role="dialog"]')?.textContent?.replace(/\s+/g, ' ') ?? '';
const mark = (page: string, at = NOW - 60_000) => sessionStorage.setItem(MARK, JSON.stringify({ page, at }));

describe('the deal on the profile', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async () => {
    await act(async () => {
      root.render(<FetchUserButtonForProfilePage profileLogin="octo-dev" />);
    });
    await act(async () => {});
  };

  const press = async (name: string) => {
    const element = elementNamed(name);
    expect(element, name).toBeDefined();
    await act(async () => element?.click());
    await act(async () => {});
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
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

  it('opens on Refresh signed out, with the badge as the way in without a star', async () => {
    session.current = SIGNED_OUT;
    await mount();
    await press('Refresh');

    expect(dialogTitle()).toBe('Hi, I’m Vitalii 👋');
    expect(dialogText()).toContain(
      'Then we update your profile every day. It stays on for 7 days after your last visit.',
    );
    expect(dialogText()).toContain('No sign-in, no 7-day limit. Already added it? Check my badge.');
    const builder = elementNamed('GitRanks badge');
    expect(builder?.getAttribute('href')).toBe('/badge/builder');
    expect(builder?.getAttribute('target')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('"Check my badge" checks the profile on screen, signed out, and says what it found', async () => {
    session.current = SIGNED_OUT;
    await mount();
    await press('Refresh');

    answer('POST /api/daily-updates/badge-check', { status: 'not_found', checksLeft: 2 });
    await press('Check my badge');
    expect(bodies('POST /api/daily-updates/badge-check')).toEqual([{ kind: 'user', name: 'octo-dev' }]);
    expect(dialogText()).toContain('We read the README of octo-dev/octo-dev and did not find the badge yet.');
    expect(dialogText()).toContain('2 checks left today.');

    answer('POST /api/daily-updates/badge-check', { status: 'found', until: iso(NOW + 7 * 24 * HOUR) });
    await press('Check my badge');
    expect(dialogText()).toContain('Badge found in the README of octo-dev/octo-dev. Daily updates are on.');
    expect(dialogText()).not.toContain('checks left today');
  });

  it('"Sign in with GitHub" marks the sign-in as the deal’s, for this profile', async () => {
    session.current = SIGNED_OUT;
    await mount();
    await press('Refresh');
    await press('Sign in with GitHub');

    expect(signIn).toHaveBeenCalledExactlyOnceWith('github-basic');
    expect(JSON.parse(sessionStorage.getItem(MARK) ?? '{}')).toEqual({ page: 'profile:octo-dev', at: NOW });
  });

  it('back from that sign-in on their own profile, starts daily updates and asks for the star when there is none', async () => {
    session.current = OWNER;
    mark('profile:octo-dev');
    answer('GET /api/daily-updates', viewerOf());
    answer('POST /api/daily-updates', { status: 'not_starred' });
    await mount();

    expect(bodies('POST /api/daily-updates')).toEqual([{ login: 'octo-dev' }]);
    expect(dialogTitle()).toBe('One step left: star our repo');
    expect(dialogText()).toContain('Done: Signed in with GitHub.');
    expect(elementNamed('Star on GitHub')?.getAttribute('href')).toBe('https://github.com/gitranks/gitranks-ui');
    expect(sessionStorage.getItem(MARK)).toBeNull();

    answer('POST /api/daily-updates', {
      status: 'started',
      until: iso(NOW + 7 * 24 * HOUR),
      refreshed: false,
      nextAt: iso(NOW + HOUR),
    });
    await press('I starred it');
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Thanks for the star! Daily updates are on for 7 days.');
  });

  it('back from that sign-in, claims today’s refresh while daily updates are closed to the visitor', async () => {
    session.current = OWNER;
    mark('profile:octo-dev');
    answer('GET /api/daily-updates', viewerOf({ open: false }));
    answer('GET /api/daily-refresh', { available: true, nextAt: null });
    answer('POST /api/daily-refresh', { status: 'not_starred' });
    await mount();

    expect(calls()).toContain('POST /api/daily-refresh');
    expect(dialogTitle()).toBe('One step left: star our repo');
  });

  it('does nothing more when daily updates are on already, on someone else’s profile, or without the mark', async () => {
    session.current = OWNER;
    mark('profile:octo-dev');
    answer('GET /api/daily-updates', viewerOf({ state: 'on', until: iso(NOW + HOUR) }));
    await mount();
    expect(calls()).toEqual(['GET /api/daily-updates']);
    expect(sessionStorage.getItem(MARK)).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);
    fetchMock.mockClear();
    session.current = SOMEONE;
    mark('profile:octo-dev');
    await mount();
    expect(calls()).toEqual([]);
    expect(dialogTitle()).toBeNull();
    expect(sessionStorage.getItem(MARK)).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);
    fetchMock.mockClear();
    session.current = OWNER;
    answer('GET /api/daily-updates', viewerOf());
    await mount();
    expect(calls()).toEqual(['GET /api/daily-updates']);
    expect(dialogTitle()).toBeNull();
  });
});
