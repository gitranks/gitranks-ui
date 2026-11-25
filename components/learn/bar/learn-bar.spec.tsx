// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const path = vi.hoisted(() => ({ current: '/learn' }));

vi.mock('next/navigation', () => ({
  usePathname: () => path.current,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));
vi.mock('@/lib/workspace/actions', () => ({ readWorkspaceChanges: vi.fn(), readNeedsYouCount: vi.fn() }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const auth = vi.hoisted(() => ({ status: 'loading' as 'loading' | 'authenticated' | 'unauthenticated' }));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: undefined, status: auth.status }) }));
const { startLearnSetupGuessAction } = vi.hoisted(() => ({ startLearnSetupGuessAction: vi.fn() }));
vi.mock('@/lib/learn/setup.actions', () => ({ startLearnSetupGuessAction }));

const { LearnBar } = await import('./learn-bar');
const { LearnBarLive } = await import('./learn-bar-live');
const { learnBarRows, learnBarPhoneRows, learnSetupTabRows } = await import('@/lib/learn/__fixtures__/learn-bar');

describe("Learn's bar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    hint.present = true;
    auth.status = 'loading';
    startLearnSetupGuessAction.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const SETUP_READY = 'Set up Learn, our guess is ready to check';
  const SETUP_WORKING = 'Set up Learn, reading your GitHub profile';
  const SETUP_OPEN = 'Set up Learn, nothing to check yet';
  const setupLook = () => container.querySelector('[data-learn-setup-tab]')?.getAttribute('data-learn-setup-tab');

  /** The tabs drawn for everyone; a signed-in person's, drawn from the browser's hint alone, are left out. */
  const tabs = () => [...container.querySelectorAll('ul a')].filter((a) => !isHinted(a)).map((a) => a.textContent);
  const isHinted = (a: Element) => !!a.closest('li')?.classList.contains('hidden');
  const hintedTabs = () => [...container.querySelectorAll('ul a')].filter(isHinted).map((a) => a.textContent);
  const current = () => [...container.querySelectorAll('[aria-current="page"]')].map((a) => a.textContent);
  const items = () =>
    [...container.querySelectorAll('[data-learn-bar-item]')].map((a) => [a.getAttribute('href'), a.textContent]);

  /** What each row of page 7's board shows: the tabs, the current place, and the right side. */
  const expected = [
    { tabs: 3, current: ['Home'], items: [] },
    { tabs: 5, current: ['Home'], items: [['/learn/setup', SETUP_READY]] },
    { tabs: 5, current: ['Home'], items: [] },
    { tabs: 5, current: ['Home'], items: [['/learn/review', 'Review 6 lessons due']] },
    {
      tabs: 5,
      current: ['Home'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests'],
        ['/learn/review', 'Review 6 lessons due'],
      ],
    },
    {
      tabs: 5,
      current: ['Home'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests 1 need you'],
        ['/learn/review', 'Review 6 lessons due'],
      ],
    },
    {
      tabs: 5,
      current: ['Pull requests 1 need you'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests 1 need you'],
        ['/learn/review', 'Review 6 lessons due'],
      ],
    },
    { tabs: 5, current: ['Settings'], items: [['/learn/review', 'Review 6 lessons due']] },
  ];

  it.each(learnBarRows.map((row, index) => [row.title, row, expected[index]] as const))(
    'draws %s',
    async (_title, row, want) => {
      await act(async () => root.render(<LearnBar state={row.state} place={row.place} />));
      expect(tabs()).toHaveLength(want.tabs);
      expect(current()).toEqual(want.current);
      expect(items()).toEqual(want.items);
    },
  );

  it('draws the phone rows with the same parts', async () => {
    for (const row of learnBarPhoneRows) {
      await act(async () => root.render(<LearnBar state={row.state} place={row.place} />));
      expect(container.querySelector('[data-learn-bar]')?.getAttribute('data-learn-bar')).toBe(row.state.kind);
      expect(current()).toEqual(['Home']);
      expect(tabs()).toHaveLength(row.state.kind === 'visitor' ? 2 : 5);
    }
  });

  it('scrolls the current tab back into sight when the right side fills in and narrows the list', async () => {
    const watched: { box: Element; again: () => void }[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly again: () => void) {}
        observe(box: Element) {
          watched.push({ box, again: this.again });
        }
        disconnect() {}
      },
    );
    await act(async () => root.render(<LearnBar state={{ kind: 'visitor' }} place="courses" />));
    const list = container.querySelector('ul')!;
    const tab = container.querySelector<HTMLElement>('[data-learn-tab="courses"]')!;
    // The list shows 0–200; the tab, once the right side is in, sits at 260–320.
    list.getBoundingClientRect = () => ({ left: 0, right: 200 }) as DOMRect;
    tab.getBoundingClientRect = () => ({ left: 260, right: 320 }) as DOMRect;
    const state = { kind: 'learner' as const, due: 6, pullRequests: true, pullRequestsNeedYou: 0 };
    await act(async () => root.render(<LearnBar state={state} place="courses" />));
    expect(watched.map(({ box }) => box)).toEqual([list]);
    watched[0].again();
    expect(list.scrollLeft).toBe(120);
  });

  it('says one lesson due in the singular', async () => {
    const state = { kind: 'learner' as const, due: 1, pullRequests: false, pullRequestsNeedYou: 0 };
    await act(async () => root.render(<LearnBar state={state} place={null} />));
    expect(items()).toEqual([['/learn/review', 'Review 1 lesson due']]);
  });

  it("starts as a visitor's bar and reads the person's in the browser, again on each new page", async () => {
    const answers: ((res: Response) => void)[] = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => answers.push(resolve)));
    vi.stubGlobal('fetch', fetchMock);
    const bar = (due: number) =>
      Response.json({ bar: { setup: 'SAVED', due, pullRequests: false, pullRequestsNeedYou: 0 } });
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    // Before the read answers: a visitor's bar, the current tab already marked.
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/bar', { cache: 'no-store' });
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    expect(current()).toEqual(['Courses']);
    expect(items()).toEqual([]);

    await act(async () => answers[0](bar(2)));
    expect(tabs()).toHaveLength(5);
    expect(items()).toEqual([['/learn/review', 'Review 2 lessons due']]);

    // Two moves: the newer read answers first, and the older one, late, is dropped.
    path.current = '/learn/courses/algorithms';
    await act(async () => root.render(<LearnBarLive />));
    path.current = '/learn/progress';
    await act(async () => root.render(<LearnBarLive />));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(async () => answers[2](bar(1)));
    await act(async () => answers[1](bar(9)));
    expect(current()).toEqual(['Progress']);
    expect(items()).toEqual([['/learn/review', 'Review 1 lesson due']]);
  });

  it("draws a signed-in person's tabs from the first paint, in their places, shown by the browser's hint", async () => {
    // The page drawn for everyone: Progress and Settings are there, after Issues, hidden unless the root holds the hint.
    await act(async () => root.render(<LearnBar state={{ kind: 'visitor' }} place="courses" />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    expect(hintedTabs()).toEqual(['Progress', 'Settings']);
    const hinted = [...container.querySelectorAll('li')].filter((li) => li.classList.contains('hidden'));
    for (const li of hinted) expect(li.className).toContain('[html[data-has-session]_&]:list-item');

    // The person's bar read: the same five, now drawn for them, in the same order, so nothing moves.
    const state = { kind: 'learner' as const, due: 0, pullRequests: false, pullRequestsNeedYou: 0 };
    await act(async () => root.render(<LearnBar state={state} place="courses" />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues', 'Progress', 'Settings']);
    expect(hintedTabs()).toEqual([]);
  });

  it("draws a visitor's tabs alone once the session says nobody is signed in", async () => {
    auth.status = 'unauthenticated';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ bar: null })),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    expect(hintedTabs()).toEqual([]);
  });

  it('records itself as the bar seen last, for a visitor too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ bar: null })),
    );
    // biome-ignore lint/suspicious/noDocumentCookie: the spec starts from Contribute's bar.
    document.cookie = 'gr_last_bar=contribute; Path=/';
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(document.cookie).toContain('gr_last_bar=learn');
  });

  it('marks Settings on Settings opened from Learn', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ bar: { setup: 'SAVED', due: 0, pullRequests: false, pullRequestsNeedYou: 0 } }),
      ),
    );
    path.current = '/my/settings';
    await act(async () => root.render(<LearnBarLive from="learn" />));
    expect(current()).toEqual(['Settings']);
  });

  it("keeps a visitor's bar when the read fails", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    expect(items()).toEqual([]);
  });

  it("shows Issues on a visitor's bar", async () => {
    hint.present = false;
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    await act(async () => root.render(<LearnBar state={{ kind: 'visitor' }} place={null} />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
  });

  /** What each row of page 5's board of the tab shows: its look, the right side, and the current place. */
  const setupExpected = [
    { look: 'working', items: [['/learn/setup', SETUP_WORKING]], current: ['Courses'] },
    { look: 'guessed', items: [['/learn/setup', SETUP_READY]], current: ['Courses'] },
    { look: undefined, items: [], current: [] },
    {
      look: 'guessed',
      items: [
        ['/learn/setup', SETUP_READY],
        ['/my/pull-requests?from=learn', 'Pull requests 1 need you'],
        ['/learn/review', 'Review 6 lessons due'],
      ],
      current: ['Home'],
    },
    { look: undefined, items: [['/learn/review', 'Review 6 lessons due']], current: ['Home'] },
    { look: undefined, items: [], current: ['Home'] },
    { look: 'open', items: [['/learn/setup', SETUP_OPEN]], current: ['Courses'] },
  ];

  it.each(learnSetupTabRows.map((row, index) => [row.title, row, setupExpected[index]] as const))(
    'draws the setup tab: %s',
    async (_title, row, want) => {
      await act(async () => root.render(<LearnBar state={row.state} place={row.place} />));
      expect(setupLook()).toBe(want.look);
      expect(items()).toEqual(want.items);
      expect(current()).toEqual(want.current);
    },
  );

  it('spins and pulses only for people who did not turn motion off', async () => {
    const [working, ready] = learnSetupTabRows;
    await act(async () => root.render(<LearnBar state={working.state} place={working.place} />));
    expect(container.querySelector('[data-learn-setup-tab] svg')?.getAttribute('class')).toContain(
      'motion-safe:animate-spin',
    );
    await act(async () => root.render(<LearnBar state={ready.state} place={ready.place} />));
    const classes = container.querySelector('[data-learn-setup-tab]')?.className.split(' ') ?? [];
    expect(classes).toContain('motion-safe:animate-learn-setup-pulse');
    expect(classes.filter((name) => name.startsWith('animate-'))).toEqual([]);
    // No guess to check: no dot, no pulse.
    const open = learnSetupTabRows[6];
    await act(async () => root.render(<LearnBar state={open.state} place={open.place} />));
    expect(container.querySelector('[data-learn-setup-tab]')?.className).not.toContain('animate');
    expect(container.querySelector('[data-learn-setup-tab] [aria-hidden]')).toBeNull();
  });

  it('asks nothing without a session', async () => {
    hint.present = false;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
  });

  const barOf = (setup: string, due = 0, onboarded?: boolean | null) =>
    Response.json({ bar: { setup, due, pullRequests: false, pullRequestsNeedYou: 0, onboarded } });

  it('shows Set up Learn until the Learn sign, a saved setup without the sign included', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => barOf('SAVED', 0, false)),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(items()).toEqual([['/learn/setup', SETUP_OPEN]]);
  });

  it('shows no Set up Learn with the Learn sign, our guess still unsaved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => barOf('GUESSED', 0, true)),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(items()).toEqual([]);
  });

  it('keeps the rule from before the sign when it cannot be read: shown until the setup is saved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => barOf('GUESSED', 0, null)),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(items()).toEqual([['/learn/setup', SETUP_READY]]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => barOf('SAVED', 0, null)),
    );
    path.current = '/learn/issues';
    await act(async () => root.render(<LearnBarLive />));
    expect(items()).toEqual([]);
  });

  it('starts our guess on a first Learn page, spins while it runs, and reads again until it is in', async () => {
    vi.useFakeTimers();
    const states = ['NONE', 'WORKING', 'GUESSED'];
    const fetchMock = vi.fn(async () => barOf(states.shift() ?? 'GUESSED'));
    vi.stubGlobal('fetch', fetchMock);
    startLearnSetupGuessAction.mockResolvedValue({ ok: true, data: 'WORKING' });
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
    expect(setupLook()).toBe('working');

    await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setupLook()).toBe('working');

    await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(setupLook()).toBe('guessed');

    // In: nothing more is asked, and the guess is never started twice.
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
  });

  it('tells the page once when our guess is in, and never for a setup that was in already', async () => {
    vi.useFakeTimers();
    const settled = vi.fn();
    window.addEventListener('gitranks:learn-setup-settled', settled);
    const states = ['WORKING', 'WORKING', 'GUESSED'];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => barOf(states.shift() ?? 'GUESSED')),
    );
    path.current = '/my/settings';
    await act(async () => root.render(<LearnBarLive from="learn" />));
    await act(async () => vi.advanceTimersByTime(2000));
    expect(settled).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(2000));
    expect(settled).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(settled).toHaveBeenCalledTimes(1);

    // A bar read with the guess already in says nothing.
    path.current = '/learn';
    await act(async () => root.render(<LearnBarLive from="learn" />));
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(settled).toHaveBeenCalledTimes(1);
    window.removeEventListener('gitranks:learn-setup-settled', settled);
  });

  it("leaves our guess to Learn's onboarding on its own page, and draws no Set up Learn above it", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => barOf('NONE'));
    vi.stubGlobal('fetch', fetchMock);
    path.current = '/learn/setup';
    await act(async () => root.render(<LearnBarLive />));
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
    expect(setupLook()).toBeUndefined();
    expect(current()).toEqual([]);
    expect(tabs()).toHaveLength(5);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('says there is nothing to check when our guess cannot start, and asks no more', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => barOf('NONE'));
    vi.stubGlobal('fetch', fetchMock);
    startLearnSetupGuessAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(setupLook()).toBe('open');
    expect(items()).toEqual([['/learn/setup', SETUP_OPEN]]);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the bar as it was when a read fails while our guess runs, and stops asking', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      return calls === 3 ? new Response('', { status: 500 }) : barOf('WORKING', 2);
    });
    vi.stubGlobal('fetch', fetchMock);
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    await act(async () => vi.advanceTimersByTime(2000));
    await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Still guessing, as the last answer said: never "ready to check" without a guess.
    expect(setupLook()).toBe('working');
    expect(items()).toContainEqual(['/learn/review', 'Review 2 lessons due']);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
  });

  it('stops asking after fifteen more reads while our guess runs', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => barOf('WORKING'));
    vi.stubGlobal('fetch', fetchMock);
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    for (let tick = 0; tick < 20; tick += 1) await act(async () => vi.advanceTimersByTime(2000));
    expect(fetchMock).toHaveBeenCalledTimes(16);
    expect(setupLook()).toBe('working');
    expect(items()).toEqual([['/learn/setup', SETUP_WORKING]]);
  });
});
