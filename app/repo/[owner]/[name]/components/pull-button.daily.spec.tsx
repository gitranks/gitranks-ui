// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullButton } from './pull-button';
import type { DailyUpdatesPick, DailyUpdatesViewer } from '@/types/daily-updates.types';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { RepoPullAllowance } from '@/types/repo-pull.types';
import type { DailyUpdatesFacts } from '@/utils/daily-updates-view';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { session, toast, signIn } = vi.hoisted(() => ({
  session: { current: { data: null, status: 'loading' } as { data: unknown; status: string } },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  signIn: vi.fn(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn }));
vi.mock('@next/third-parties/google', () => ({ sendGAEvent: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();
const SIGNED_IN = { data: { user: { githubLogin: 'Mona-Dev', authMode: 'identity' } }, status: 'authenticated' };
const SIGNED_OUT = { data: null, status: 'unauthenticated' };
const LOADING = { data: null, status: 'loading' };
const PULL = 'POST /api/repo/acme/fastqueue/pull';
const PULL_STATUS = 'GET /api/repo/acme/fastqueue/pull';
const PICKS = 'POST /api/daily-updates/picks';
const REMOVE = 'DELETE /api/daily-updates/picks';
const VIEWER = 'GET /api/daily-updates';
const MARK = 'daily-updates-deal';

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
const allowanceOf = (available: boolean): RepoPullAllowance => ({
  daily: { available, nextAt: available ? null : iso(NOW + 6 * HOUR) },
  token: { used: 0, limit: 20, nextAt: null },
});
const onDaily = (reason: DailyUpdateReason): DailyUpdatesFacts => ({
  reasons: [reason],
  nextUpdateAt: iso(NOW + 5 * HOUR),
});

type Answer = { status?: number; body: unknown };
let answers: Record<string, Answer[]>;
// The status read on load answers this allowance unless a test queued another answer.
let allowance: RepoPullAllowance | null;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const key = `${init?.method ?? 'GET'} ${url}`;
  const queued = answers[key]?.shift();
  if (queued) {
    return new Response(JSON.stringify(queued.body), { status: queued.status ?? 200 });
  }
  if (key === PULL_STATUS) {
    return new Response(JSON.stringify({ pull: null, allowance }));
  }
  throw new Error(`unexpected ${key}`);
});
const answer = (key: string, body: unknown, status?: number) => {
  answers[key] = [...(answers[key] ?? []), { body, status }];
};
const calls = (key: string) => fetchMock.mock.calls.filter(([url, init]) => `${init?.method ?? 'GET'} ${url}` === key);
const bodies = (key: string) => calls(key).map(([, init]) => JSON.parse(String(init?.body)));

/** The button and the line under it, as text. */
const text = () =>
  [...(document.body.firstElementChild?.querySelectorAll('button, div.text-xs') ?? [])]
    .map((element) => element.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const dialog = () => document.querySelector('[role="dialog"]');
const dialogTitle = () => dialog()?.querySelector('h2')?.textContent ?? null;
const dialogText = () => dialog()?.textContent?.replace(/\s+/g, ' ') ?? null;
const buttonNamed = (name: string, scope: ParentNode = document) =>
  [...scope.querySelectorAll('button, a')].find((element) => element.textContent?.trim() === name) as
    | HTMLElement
    | undefined;
const rowOf = (name: string) =>
  [...(dialog()?.querySelectorAll('li') ?? [])].find((row) => row.textContent?.includes(name));

describe('PullButton: one button', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = async (dailyUpdates: DailyUpdatesFacts = null) => {
    await act(async () => {
      root.render(<PullButton owner="acme" name="fastqueue" dailyUpdates={dailyUpdates} />);
    });
    await act(async () => {});
  };

  const remount = async (dailyUpdates: DailyUpdatesFacts = null) => {
    act(() => root.unmount());
    root = createRoot(container);
    await mount(dailyUpdates);
  };

  const press = async (name: string, scope?: ParentNode) => {
    const element = buttonNamed(name, scope);
    expect(element, name).toBeDefined();
    await act(async () => element?.click());
  };

  /** The page's one button, whatever its label. */
  const pressButton = async () => {
    const button = document.body.firstElementChild?.querySelector('button');
    await act(async () => button?.click());
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    answers = {};
    allowance = allowanceOf(true);
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('scrollTo', vi.fn());
    for (const fn of Object.values(toast)) fn.mockReset();
    signIn.mockReset();
    sessionStorage.clear();
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

  describe('while the session loads', () => {
    it('shows Refresh, reads nothing, and a press does nothing', async () => {
      session.current = LOADING;
      await mount();

      expect(text()).toBe('Refresh');
      await pressButton();
      expect(dialog()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('shows a repository on daily updates as anyone sees it, and a press does nothing', async () => {
      session.current = LOADING;
      await mount(onDaily(DailyUpdateReason.Badge));

      expect(text()).toBe('Updates daily Updates daily: it has a GitRanks badge in its README. Next update in 5 h.');
      await pressButton();
      expect(dialog()).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('signed out', () => {
    it('shows Refresh; a press opens today’s sign-in, which marks the sign-in as started here', async () => {
      session.current = SIGNED_OUT;
      await mount();

      expect(text()).toBe('Refresh');
      await press('Refresh');
      expect(dialogTitle()).toBe('Hi, I’m Vitalii 👋');
      expect(dialogText()).toContain('Get 1 star history fetch every day.');
      expect(dialogText()).not.toContain('pick');
      expect(fetchMock).not.toHaveBeenCalled();

      await press('Sign in with GitHub');
      expect(signIn).toHaveBeenCalledExactlyOnceWith('github-basic');
      expect(JSON.parse(sessionStorage.getItem(MARK) ?? '{}')).toEqual({ page: 'repo:acme/fastqueue', at: NOW });
    });

    it('drops the mark of a sign-in given up, once the page settles signed out', async () => {
      session.current = SIGNED_OUT;
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:acme/fastqueue', at: NOW }));
      await mount();

      expect(sessionStorage.getItem(MARK)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('on a repository someone picked: says only that it updates daily; the dialog says when next, with no refresh', async () => {
      session.current = SIGNED_OUT;
      await mount(onDaily(DailyUpdateReason.Pick));
      expect(text()).toBe('Updates daily Updates daily. Next update in 5 h.');

      await press('Updates daily');
      expect(dialogTitle()).toBe('This repository updates every day');
      expect(dialogText()).toContain('Next update in 5 h.');
      expect(buttonNamed('Refresh now')).toBeUndefined();
      expect(buttonNamed('Remove')).toBeUndefined();
      expect(dialogText()).not.toMatch(/@|Mona|picked by/);

      await press('OK');
      expect(dialog()).toBeNull();
    });
  });

  describe('signed in, the state not open or not read', () => {
    it('reads the state after load, with no-store', async () => {
      answer(VIEWER, viewerOf());
      await mount();

      expect(calls(VIEWER)[0]).toEqual(['/api/daily-updates', { cache: 'no-store' }]);
    });

    it('shows Refresh while the API keeps daily updates closed, or the read fails; a press refreshes', async () => {
      answer(VIEWER, viewerOf({ open: false, state: 'never' }));
      await mount();
      expect(text()).toBe('Refresh · 1 left');

      answer(PULL, { status: 'started', pullId: 'p1', nextAt: iso(NOW + 24 * HOUR) });
      await press('Refresh · 1 left');
      expect(calls(PULL)).toHaveLength(1);
      expect(calls(PICKS)).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('Thanks for the star! ⭐ Fetching the star history now.');

      answers = {};
      answer(VIEWER, { message: 'Not Found' }, 404);
      await remount();
      expect(text()).toBe('Refresh · 1 left');
    });
  });

  describe('"Update daily": a pick left', () => {
    it('labels the button and its line', async () => {
      answer(VIEWER, viewerOf({ state: 'never', picks: picked('octo/rocket'), newPicksLeftToday: 2 }));
      await mount();

      expect(text()).toBe('Update daily Update up to 3 repos daily.');
    });

    it.each([
      ['3 picks held', viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas'), newPicksLeftToday: 2 })],
      ['no new pick left today', viewerOf({ picks: picked('octo/rocket'), newPicksLeftToday: 0 })],
    ])('shows Refresh with %s', async (_, viewer) => {
      answer(VIEWER, viewer);
      await mount();

      expect(text()).toBe('Refresh · 1 left');
    });

    it('picks the repository, then refreshes it now', async () => {
      answer(VIEWER, viewerOf({ state: 'never' }));
      await mount();

      answer(PICKS, { status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });
      answer(PULL, { status: 'started', pullId: 'p1', nextAt: iso(NOW + 24 * HOUR) });
      await press('Update daily');

      expect(bodies(PICKS)).toEqual([{ kind: 'repo', name: 'acme/fastqueue' }]);
      expect(calls(PULL)).toHaveLength(1);
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('Refreshing now. This repository is on daily updates.');
      expect(text()).toBe('Fetching… Next check in 20 s');
    });

    it.each<[string, Answer]>([
      ['today’s fetch is used', { body: { status: 'used', nextAt: iso(NOW + 6 * HOUR) } }],
      ['the fetch is not ready', { body: { status: 'not_ready', until: iso(NOW + 2 * HOUR) } }],
      ['the refresh fails', { body: { message: 'Bad Gateway' }, status: 502 }],
      ['the refresh is refused', { body: { message: 'Forbidden' }, status: 403 }],
    ])('keeps the pick when %s, and says its first update comes soon', async (_, refusal) => {
      answer(VIEWER, viewerOf({ state: 'never' }));
      await mount();

      answer(PICKS, { status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });
      answer(PULL, refusal.body, refusal.status);
      await press('Update daily');

      expect(calls(PULL)).toHaveLength(1);
      expect(dialog()).toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledExactlyOnceWith(
        'This repository is on daily updates. Its first update comes soon.',
      );
      expect(text()).toBe('Updates daily You added it.');
    });

    it('asks for no refresh when today’s fetch is known to be used', async () => {
      allowance = allowanceOf(false);
      answer(VIEWER, viewerOf());
      await mount();

      answer(PICKS, { status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 });
      await press('Update daily');

      expect(calls(PULL)).toHaveLength(0);
      expect(toast.success).toHaveBeenCalledExactlyOnceWith(
        'This repository is on daily updates. Its first update comes soon.',
      );
    });

    it('shows the check on the button while the pick runs', async () => {
      answer(VIEWER, viewerOf());
      await mount();

      let answered: (response: Response) => void = () => {};
      fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (answered = resolve)));
      await press('Update daily');
      const button = document.body.firstElementChild?.querySelector('button');
      expect(button?.textContent).toBe('Checking…');
      expect(button?.disabled).toBe(true);

      answer(PULL, { status: 'up_to_date' });
      await act(async () =>
        answered(
          new Response(JSON.stringify({ status: 'picked', picks: picked('acme/fastqueue'), newPicksLeftToday: 2 })),
        ),
      );
      expect(text()).toBe('Updates daily You added it.');
    });

    it('asks to remove one when all 3 are used, from the picks as they are now, then "Done" picks and refreshes', async () => {
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket', 'octo/lantern') }));
      await mount();

      // Another tab added a third pick since the page read them.
      answer(PICKS, { status: 'full' });
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas'), newPicksLeftToday: 1 }));
      await press('Update daily');
      expect(dialogTitle()).toBe('You update 3 repos daily');
      expect(dialogText()).toContain('Remove one to add this repo.');
      expect(dialogText()).not.toContain('Your profile');

      answer(REMOVE, { status: 'removed', picks: picked('octo/rocket', 'octo/lantern') });
      await press('Remove', rowOf('quiet/atlas'));
      expect(bodies(REMOVE)).toEqual([{ kind: 'repo', name: 'quiet/atlas' }]);

      answer(PICKS, {
        status: 'picked',
        picks: picked('octo/rocket', 'octo/lantern', 'acme/fastqueue'),
        newPicksLeftToday: 1,
      });
      answer(PULL, { status: 'up_to_date' });
      await press('Done');

      expect(bodies(PICKS)).toHaveLength(2);
      expect(calls(PULL)).toHaveLength(1);
      expect(dialog()).toBeNull();
      expect(text()).toBe('Updates daily You added it.');
    });

    it('"Cancel" with all 3 picks used picks nothing', async () => {
      const three = viewerOf({ picks: picked('octo/rocket', 'octo/lantern'), newPicksLeftToday: 2 });
      answer(VIEWER, three);
      await mount();
      answer(PICKS, { status: 'full' });
      answer(VIEWER, { ...three, picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas') });
      await press('Update daily');

      await press('Cancel');

      expect(dialog()).toBeNull();
      expect(bodies(PICKS)).toHaveLength(1);
      expect(calls(PULL)).toHaveLength(0);
    });

    it('says when the next new pick opens after 3 new picks today', async () => {
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket') }));
      await mount();

      answer(PICKS, { status: 'daily_limit', nextAt: iso(NOW + 12 * HOUR) });
      await press('Update daily');

      expect(dialogTitle()).toBe('No more repos today');
      expect(dialogText()).toContain('You can add another repo in 12 h.');
      expect(calls(PULL)).toHaveLength(0);
    });

    it('does not ask for a removal when the re-read finds no new pick left today', async () => {
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket', 'octo/lantern') }));
      await mount();

      answer(PICKS, { status: 'full' });
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas'), newPicksLeftToday: 0 }));
      await press('Update daily');

      expect(dialogTitle()).toBe('No more repos today');
      expect(dialogText()).toContain('You can add another repo in 12 h.');
      expect(buttonNamed('Remove')).toBeUndefined();
    });

    it.each([
      [410, 'This account’s data was removed from GitRanks at its owner’s request.'],
      [400, 'This repository can’t be updated daily right now.'],
      [502, 'GitHub didn’t answer. Please try again in a minute.'],
    ])('says why a pick answered %i, and refreshes nothing', async (status, message) => {
      answer(VIEWER, viewerOf());
      await mount();

      answer(PICKS, { message: 'refused' }, status);
      await press('Update daily');

      expect(toast.error).toHaveBeenCalledExactlyOnceWith(message);
      expect(calls(PULL)).toHaveLength(0);
    });

    it('asks for the star as the next step, and "I starred it" asks again', async () => {
      answer(VIEWER, viewerOf({ state: 'never' }));
      await mount();

      answer(PICKS, { status: 'not_starred' });
      await press('Update daily');
      expect(dialogTitle()).toBe('One step left: star our repo');
      expect(buttonNamed('Star on GitHub')?.getAttribute('href')).toBe('https://github.com/gitranks/gitranks-ui');

      answer(PICKS, { status: 'blocked', until: iso(NOW + HOUR) });
      await press('I starred it');
      expect(dialogTitle()).toBe('Our robot needs a break 🥱');
      expect(dialogText()).toContain('Try again in 1 h.');
      expect(calls(PULL)).toHaveLength(0);
    });

    it('says so when the repository cannot be picked, and shows Refresh once daily updates closed', async () => {
      answer(VIEWER, viewerOf());
      await mount();

      answer(PICKS, { status: 'not_held' });
      await press('Update daily');
      expect(toast.info).toHaveBeenCalledExactlyOnceWith('This repository can’t be updated daily right now.');

      answer(PICKS, { message: 'Forbidden' }, 403);
      await press('Update daily');
      expect(text()).toBe('Refresh · 1 left');
      expect(calls(PULL)).toHaveLength(0);
    });
  });

  describe('"Updates daily": on daily updates', () => {
    it('on someone’s pick: names nobody; the dialog says when next and refreshes now', async () => {
      answer(VIEWER, viewerOf({ picks: picked('octo/rocket') }));
      await mount(onDaily(DailyUpdateReason.Pick));
      expect(text()).toBe('Updates daily Updates daily. Next update in 5 h.');

      await press('Updates daily');
      expect(dialogTitle()).toBe('This repository updates every day');
      expect(dialogText()).toContain('Next update in 5 h.');
      expect(buttonNamed('Remove')).toBeUndefined();
      expect(dialogText()).not.toContain('octo/rocket');

      answer(PULL, { status: 'started', pullId: 'p1', nextAt: iso(NOW + 24 * HOUR) });
      await press('Refresh now');
      expect(calls(PULL)).toHaveLength(1);
      expect(calls(PICKS)).toHaveLength(0);
      expect(dialog()).toBeNull();
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('Thanks for the star! ⭐ Fetching the star history now.');
      expect(text()).toBe('Fetching… Next check in 20 s');
    });

    it('offers no refresh once today’s fetch is used', async () => {
      allowance = allowanceOf(false);
      answer(VIEWER, viewerOf());
      await mount(onDaily(DailyUpdateReason.Badge));

      await press('Updates daily');
      expect(buttonNamed('Refresh now')).toBeUndefined();
      await press('OK');
      expect(dialog()).toBeNull();
      expect(calls(PULL)).toHaveLength(0);
    });

    it('offers the refresh while the allowance is unknown: the API decides', async () => {
      answer(PULL_STATUS, { message: 'Bad Gateway' }, 502);
      answer(VIEWER, viewerOf());
      await mount(onDaily(DailyUpdateReason.Badge));

      await press('Updates daily');
      answer(PULL, { status: 'used', nextAt: iso(NOW + 6 * HOUR) });
      await press('Refresh now');
      expect(calls(PULL)).toHaveLength(1);
      expect(dialogTitle()).toBe('Easy, tiger 🐯');
      expect(dialogText()).toContain('Today’s fetch is used. The next one is in 6 h.');
    });

    it.each<[string, RepoPullAllowance | null]>([
      ['fetches left', { ...allowanceOf(false), token: { used: 3, limit: 20, nextAt: null } }],
      ['an unknown allowance', null],
    ])('offers a token visitor the refresh with %s', async (_, tokenAllowance) => {
      session.current = { data: { user: { githubLogin: 'Mona-Dev', authMode: 'token' } }, status: 'authenticated' };
      allowance = tokenAllowance;
      answer(VIEWER, viewerOf());
      await mount(onDaily(DailyUpdateReason.Pick));

      await press('Updates daily');
      answer(PULL, { status: 'started', pullId: 'p1' });
      await press('Refresh now');
      expect(calls(PULL)).toHaveLength(1);
      expect(toast.success).toHaveBeenCalledExactlyOnceWith('Fetching the star history now.');
    });

    it('offers a token visitor no refresh once their fetches of today are used', async () => {
      session.current = { data: { user: { githubLogin: 'Mona-Dev', authMode: 'token' } }, status: 'authenticated' };
      allowance = { ...allowanceOf(false), token: { used: 20, limit: 20, nextAt: iso(NOW + 6 * HOUR) } };
      answer(VIEWER, viewerOf());
      await mount(onDaily(DailyUpdateReason.Pick));

      await press('Updates daily');
      expect(buttonNamed('Refresh now')).toBeUndefined();
      await press('OK');
      expect(calls(PULL)).toHaveLength(0);
    });

    it('on the visitor’s pick: lists their daily updates, refreshes now, and removes one', async () => {
      answer(VIEWER, viewerOf({ picks: picked('ACME/fastqueue', 'octo/rocket') }));
      await mount(onDaily(DailyUpdateReason.Pick));
      expect(text()).toBe('Updates daily You added it. Next update in 5 h.');

      await press('Updates daily');
      expect(dialogTitle()).toBe('Your daily updates');
      expect(dialogText()).toContain('Next update in 5 h.');
      expect(dialogText()).toContain('We update these every day. They stay on for 7 days after your last visit.');
      expect(dialogText()).toContain('Mona-DevYour profile');
      expect(dialogText()).toContain('You can add 1 more repo.');
      expect(dialogText()).not.toMatch(/\bpicks?\b|a day/i);
      expect(buttonNamed('Refresh now')).toBeDefined();

      answer(REMOVE, { status: 'removed', picks: picked('ACME/fastqueue') });
      await press('Remove', rowOf('octo/rocket'));
      expect(bodies(REMOVE)).toEqual([{ kind: 'repo', name: 'octo/rocket' }]);
      expect(dialogText()).not.toContain('octo/rocket');
      expect(dialogText()).toContain('You can add 2 more repos.');

      answer(PULL, { status: 'running' });
      await press('Refresh now');
      expect(calls(PULL)).toHaveLength(1);
      expect(dialog()).toBeNull();
    });

    it('removes this repository’s own pick with the dialog still open, then offers it again', async () => {
      allowance = allowanceOf(false);
      answer(VIEWER, viewerOf({ picks: picked('acme/fastqueue', 'octo/rocket') }));
      await mount(onDaily(DailyUpdateReason.Pick));
      await press('Updates daily');

      answer(REMOVE, { status: 'removed', picks: picked('octo/rocket') });
      await press('Remove', rowOf('acme/fastqueue'));

      expect(dialogTitle()).toBe('Your daily updates');
      expect(dialogText()).not.toContain('acme/fastqueue');
      expect(dialogText()).not.toContain('Next update');
      await press('Done');
      expect(dialog()).toBeNull();
      expect(text()).toBe('Update daily Update up to 3 repos daily.');
    });

    it('shows a held pick as anyone sees it while the visitor’s daily updates are off, and offers no pick of it', async () => {
      answer(VIEWER, viewerOf({ state: 'lapsed', picks: picked('acme/fastqueue') }));
      await mount(onDaily(DailyUpdateReason.Pick));
      expect(text()).toBe('Updates daily Updates daily. Next update in 5 h.');

      answers = {};
      answer(VIEWER, viewerOf({ state: 'lapsed', picks: picked('acme/fastqueue') }));
      await remount(null);
      expect(text()).toBe('Refresh · 1 left');
    });
  });

  describe('back from a sign-in started at Refresh’s sign-in', () => {
    it('refreshes by itself, once, and leaves "Update daily" for a press of its own', async () => {
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:acme/fastqueue', at: NOW - 60_000 }));
      answer(VIEWER, viewerOf({ state: 'never' }));
      answer(PULL, { status: 'up_to_date' });
      await mount();
      await act(async () => {});

      expect(calls(PICKS)).toHaveLength(0);
      expect(calls(PULL)).toHaveLength(1);
      expect(toast.info).toHaveBeenCalledExactlyOnceWith('The star history is already up to date.');
      expect(text()).toBe('Update daily Update up to 3 repos daily.');
      expect(sessionStorage.getItem(MARK)).toBeNull();

      await remount();
      expect(calls(PULL)).toHaveLength(1);
    });

    it('asks for the star when the refresh finds none', async () => {
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:acme/fastqueue', at: NOW }));
      answer(VIEWER, viewerOf({ state: 'never' }));
      answer(PULL, { status: 'not_starred' });
      await mount();

      expect(calls(PICKS)).toHaveLength(0);
      expect(dialogTitle()).toBe('This fetch costs 1 star ⭐');
    });

    it.each([
      ['daily updates are closed', viewerOf({ open: false, state: 'never' })],
      ['3 repos are on daily updates', viewerOf({ picks: picked('octo/rocket', 'octo/lantern', 'quiet/atlas') })],
      ['no new repo can be added today', viewerOf({ picks: picked('octo/rocket'), newPicksLeftToday: 0 })],
    ])('refreshes by itself when %s', async (_, viewer) => {
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:acme/fastqueue', at: NOW }));
      answer(VIEWER, viewer);
      answer(PULL, { status: 'started', pullId: 'p1', nextAt: iso(NOW + 24 * HOUR) });
      await mount();

      expect(calls(PICKS)).toHaveLength(0);
      expect(calls(PULL)).toHaveLength(1);
      expect(text()).toBe('Fetching… Next check in 20 s');
    });

    it('opens nothing on a repository on daily updates, and leaves another page’s mark', async () => {
      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:acme/fastqueue', at: NOW }));
      answer(VIEWER, viewerOf());
      await mount(onDaily(DailyUpdateReason.Badge));
      expect(calls(PICKS)).toHaveLength(0);
      expect(calls(PULL)).toHaveLength(0);
      expect(dialog()).toBeNull();
      expect(sessionStorage.getItem(MARK)).toBeNull();

      sessionStorage.setItem(MARK, JSON.stringify({ page: 'repo:octo/rocket', at: NOW }));
      answer(VIEWER, viewerOf());
      await remount();
      expect(calls(PICKS)).toHaveLength(0);
      expect(sessionStorage.getItem(MARK)).not.toBeNull();
    });
  });
});
