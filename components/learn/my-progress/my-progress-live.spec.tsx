// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

const { hint, signIn } = vi.hoisted(() => ({ hint: { present: false }, signIn: vi.fn(async () => undefined) }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({ signIn }));

const { MyProgressLive, readHistory, readMyProgress } = await import('./my-progress-live');
const { historyEarlier, historyFirst, myFixes, myProgress, myProgressEmpty, myProgressFirstDay, myWalkthroughs } =
  await import('@/lib/learn/__fixtures__/my-progress');
const { learnDayOfDate } = await import('@/lib/learn/my-progress');

/** The first day, on `day`. */
const myProgressFirstDayOn = (day: string) => ({
  ...myProgressFirstDay,
  days: myProgressFirstDay.days.map((each) => ({ ...each, day })),
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

/** The two routes: the progress, and History's pages by `before`. */
function routes({
  progress = myProgress as unknown,
  progressStatus = 200,
  history = (before: string | null): unknown => (before === '2026-11-12' ? historyEarlier : historyFirst),
  historyStatus = 200,
} = {}) {
  fetchMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/me/learn/progress/history')) {
      const before = new URL(path, 'https://gitranks.com').searchParams.get('before');
      return json({ history: history(before), signedOut: false }, historyStatus);
    }
    return json({ progress, signedOut: false }, progressStatus);
  });
}
const historyCalls = () =>
  fetchMock.mock.calls.map(([path]) => path as string).filter((path) => path.includes('/history'));

beforeEach(() => {
  window.history.replaceState(null, '', '/learn/progress');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  signIn.mockClear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  hint.present = false;
  vi.unstubAllGlobals();
});

const draw = (view: 'courses' | 'fixes' | 'walkthroughs' | 'history' = 'courses', day: string | null = null) =>
  act(async () => {
    root.render(<MyProgressLive view={view} day={day} />);
  });
const click = (element: Element) =>
  act(async () => {
    (element as HTMLElement).click();
  });
const stateOf = () => host.querySelector('[data-my-progress]')?.getAttribute('data-my-progress') ?? 'ready';

describe('My progress in the browser', () => {
  it('asks for nothing for a visitor, and offers to sign in, coming back here', async () => {
    await draw('history');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stateOf()).toBe('visitor');
    expect(document.activeElement).toBe(host.querySelector('h1'));
    await click(host.querySelector('button')!);
    expect(signIn).toHaveBeenCalledWith(expect.any(String), { redirectTo: '/learn/progress?view=history' });
  });

  it('signing in again from History opened at a day comes back to that day', async () => {
    await draw('history', '2026-11-20');
    await click(host.querySelector('button')!);
    expect(signIn).toHaveBeenCalledWith(expect.any(String), {
      redirectTo: '/learn/progress?view=history&day=2026-11-20',
    });
  });

  it('keeps the boxes’ places while the progress is on its way, with a title for screen readers', async () => {
    hint.present = true;
    fetchMock.mockReturnValue(new Promise(() => {}));
    await draw();
    expect(stateOf()).toBe('pending');
    expect(host.querySelector('h1')!.textContent).toBe('Your progress');
    expect(host.querySelector('[role="status"]')!.textContent).toBe('Loading your progress…');
  });

  it('reads the person’s progress once, never kept, and does not read History on Courses', async () => {
    hint.present = true;
    routes();
    await draw();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/progress', { cache: 'no-store' });
    expect(stateOf()).toBe('ready');
    expect(host.querySelectorAll('[data-my-course]')).toHaveLength(3);
  });

  it('nothing yet: no boxes and no switch, one way on', async () => {
    hint.present = true;
    routes({ progress: myProgressEmpty });
    await draw();
    expect(stateOf()).toBe('empty');
    expect(host.querySelector('[data-calendar]')).toBeNull();
    expect(host.querySelector('nav')).toBeNull();
  });

  it('a session that ended asks to sign in again', async () => {
    hint.present = true;
    fetchMock.mockResolvedValue(json({ progress: null, signedOut: true }));
    await draw();
    expect(stateOf()).toBe('ended');
    expect(document.activeElement).toBe(host.querySelector('h1'));
  });

  it('a read that failed: the focus on its title, then Try again reads once more and the focus goes to the page', async () => {
    hint.present = true;
    fetchMock.mockResolvedValueOnce(json({}, 502));
    await draw();
    expect(stateOf()).toBe('failed');
    expect(document.activeElement).toBe(host.querySelector('h1'));
    routes();
    await click(host.querySelector('button')!);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(stateOf()).toBe('ready');
    expect(document.activeElement?.textContent).toBe('Your progress');
    // A network failure is a failed read too.
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readMyProgress()).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readHistory(null)).toBeNull();
  });

  it('History: reads the newest twenty days, then the earlier ones in place, the focus on the first added', async () => {
    hint.present = true;
    routes();
    await draw('history');
    expect(historyCalls()).toEqual(['/api/me/learn/progress/history']);
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(5);
    await click(host.querySelector('[data-history-more]')!);
    expect(historyCalls().at(-1)).toBe('/api/me/learn/progress/history?before=2026-11-12');
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(7);
    expect(document.activeElement?.closest('[data-history-day]')?.getAttribute('data-history-day')).toBe('2026-11-10');
    // The last page: no way on.
    expect(host.querySelector('[data-history-more]')).toBeNull();
  });

  it('History opened at a day: reads from that day, which takes the focus, with a way to the newest days', async () => {
    hint.present = true;
    routes();
    await draw('history', '2026-11-20');
    expect(historyCalls()).toEqual(['/api/me/learn/progress/history?before=2026-11-21']);
    expect(document.activeElement?.closest('[data-history-day]')?.getAttribute('data-history-day')).toBe('2026-11-20');
    expect(host.textContent).toContain('Show the newest days');
  });

  it('History’s first page did not come: Try again reads it once more', async () => {
    hint.present = true;
    routes({ historyStatus: 502 });
    await draw('history');
    expect(host.querySelector('[data-history="failed"]')).not.toBeNull();
    routes();
    await click(host.querySelector('[data-history="failed"] button')!);
    expect(historyCalls()).toHaveLength(2);
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(5);
  });

  it('earlier days that did not come keep the days shown, and Try again asks for them again', async () => {
    hint.present = true;
    routes({ history: (before) => (before ? null : historyFirst) });
    await draw('history');
    await click(host.querySelector('[data-history-more]')!);
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(5);
    expect(host.textContent).toContain('The earlier days did not load.');
    routes();
    await click(host.querySelector('[data-history-more]')!);
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(7);
  });

  it('switching views keeps what was read: back to History asks for nothing again', async () => {
    hint.present = true;
    routes();
    await draw('history');
    await draw('courses');
    await draw('history');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(5);
  });

  it('counts today as the route says, the day the API counts in, and the browser’s date only without it', async () => {
    hint.present = true;
    // The route says Saturday (the saved zone), whatever the browser's date: Saturday is "Today".
    fetchMock.mockResolvedValue(json({ progress: myProgressFirstDayOn('2026-11-21'), today: '2026-11-21' }));
    await draw();
    expect(host.querySelector('[data-days-line]')!.textContent).toBe('Your first day.');
    expect(host.querySelector('[data-calendar] a')!.getAttribute('aria-label')).toMatch(/^Today, Saturday 21 Nov:/);
    act(() => root.unmount());
    root = createRoot(host);
    // No today from the route: the browser's own date.
    fetchMock.mockResolvedValue(json({ progress: myProgressFirstDayOn('2026-11-21'), today: 'not a day' }));
    await draw();
    const browserToday = learnDayOfDate(new Date());
    expect(host.querySelector('[data-calendar] [data-day]:last-child')!.getAttribute('data-day')).toBe(
      browserToday > '2026-11-21' ? browserToday : '2026-11-21',
    );
  });

  it('History answering signed out, on its first page or on earlier days, asks to sign in again', async () => {
    hint.present = true;
    fetchMock.mockImplementation(async (path: string) =>
      path.includes('/history')
        ? json({ history: null, signedOut: true })
        : json({ progress: myProgress, signedOut: false }),
    );
    await draw('history');
    expect(stateOf()).toBe('ended');
    expect(document.activeElement).toBe(host.querySelector('h1'));

    act(() => root.unmount());
    root = createRoot(host);
    routes();
    await draw('history');
    fetchMock.mockImplementation(async (path: string) =>
      path.includes('/history') ? json({ history: null, signedOut: true }) : json({ progress: myProgress }),
    );
    await click(host.querySelector('[data-history-more]')!);
    expect(stateOf()).toBe('ended');
    expect(document.activeElement).toBe(host.querySelector('h1'));
  });

  it('switching away while History’s first page loads, and back: it is read again, never left loading', async () => {
    hint.present = true;
    const held: ((value: Response) => void)[] = [];
    fetchMock.mockImplementation((path: string) =>
      path.includes('/history')
        ? new Promise<Response>((resolve) => held.push(resolve))
        : Promise.resolve(json({ progress: myProgress, signedOut: false })),
    );
    await draw('history');
    expect(host.querySelector('[data-history="pending"]')).not.toBeNull();
    await draw('courses');
    await act(async () => held[0](json({ history: historyFirst, signedOut: false })));
    await draw('history');
    expect(historyCalls()).toHaveLength(2);
    await act(async () => held[1](json({ history: historyFirst, signedOut: false })));
    expect(host.querySelector('[data-history="pending"]')).toBeNull();
    expect(host.querySelectorAll('[data-history-day]')).toHaveLength(5);
  });

  it('a late answer for earlier days never lands in a History opened at another day since', async () => {
    hint.present = true;
    const august = { days: [{ ...historyEarlier.days[0], day: '2026-08-05' }], more: true };
    let release: (value: Response) => void = () => {};
    fetchMock.mockImplementation((path: string) => {
      if (!path.includes('/history')) return Promise.resolve(json({ progress: myProgress, signedOut: false }));
      if (path.endsWith('before=2026-11-12')) {
        return new Promise<Response>((resolve) => {
          release = resolve;
        });
      }
      if (path.endsWith('before=2026-08-06')) return Promise.resolve(json({ history: august, signedOut: false }));
      return Promise.resolve(json({ history: historyFirst, signedOut: false }));
    });
    await draw('history');
    await click(host.querySelector('[data-history-more]')!);
    expect(host.querySelector('[data-history-more]')!.getAttribute('data-history-more')).toBe('loading');
    // A square of "Days" opens 5 Aug while the earlier days are on their way.
    await draw('history', '2026-08-05');
    await act(async () => release(json({ history: historyEarlier, signedOut: false })));
    expect([...host.querySelectorAll('[data-history-day]')].map((day) => day.getAttribute('data-history-day'))).toEqual(
      ['2026-08-05'],
    );
    expect(host.querySelector('[data-history-more]')!.getAttribute('data-history-more')).toBe('more');
    expect(document.activeElement?.closest('[data-history-day]')?.getAttribute('data-history-day')).toBe('2026-08-05');
  });

  it('the focus after History’s Try again, and after "Show the newest days", is on the first day drawn', async () => {
    hint.present = true;
    routes({ historyStatus: 502 });
    await draw('history');
    routes();
    await click(host.querySelector('[data-history="failed"] button')!);
    expect(document.activeElement?.closest('[data-history-day]')?.getAttribute('data-history-day')).toBe('2026-11-22');

    act(() => root.unmount());
    root = createRoot(host);
    await draw('history', '2026-11-20');
    // "Show the newest days" is a link to History with no day: the page draws it again without the day.
    await draw('history', null);
    expect(document.activeElement?.closest('[data-history-day]')?.getAttribute('data-history-day')).toBe('2026-11-22');
  });

  it('switching to History with the switch leaves the focus where it is', async () => {
    hint.present = true;
    routes();
    await draw('history', '2026-11-20');
    await draw('courses');
    const link = host.querySelector<HTMLAnchorElement>('nav a[data-view="history"]')!;
    link.focus();
    await draw('history');
    expect(document.activeElement).toBe(link);
  });
});

describe('My progress: the views of real fixes in the browser', () => {
  /** The routes: the progress, and the two lists, each answering `answer` or failing with `status`. */
  function listRoutes({
    fixes = { fixes: myFixes } as unknown,
    walkthroughs = { walkthroughs: [] } as unknown,
    status = 200,
  } = {}) {
    fetchMock.mockImplementation(async (path: string) => {
      if (path === '/api/me/learn/progress/fixes') return json({ ...(fixes as object), signedOut: false }, status);
      if (path === '/api/me/learn/progress/walkthroughs') {
        return json({ ...(walkthroughs as object), signedOut: false }, status);
      }
      return json({ progress: myProgress, signedOut: false });
    });
  }
  const asked = (path: string) => fetchMock.mock.calls.filter(([each]) => each === path);

  it('reads Your fixes only when its view is shown, once, never kept, and keeps it across views', async () => {
    hint.present = true;
    listRoutes();
    await draw('courses');
    expect(asked('/api/me/learn/progress/fixes')).toHaveLength(0);
    await draw('fixes');
    expect(asked('/api/me/learn/progress/fixes')).toEqual([['/api/me/learn/progress/fixes', { cache: 'no-store' }]]);
    expect(host.querySelectorAll('[data-my-fixes] > li')).toHaveLength(myFixes.length);
    await draw('courses');
    await draw('fixes');
    expect(asked('/api/me/learn/progress/fixes')).toHaveLength(1);
    expect(asked('/api/me/learn/progress/walkthroughs')).toHaveLength(0);
  });

  it('a list that did not come says so, and Try again reads it once more', async () => {
    hint.present = true;
    listRoutes({ status: 502 });
    await draw('walkthroughs');
    expect(host.querySelector('[data-view-list="failed"]')?.textContent).toContain('Your walkthroughs did not load.');
    listRoutes({ walkthroughs: { walkthroughs: myWalkthroughs.map(({ passedAt, ...fix }) => ({ fix, passedAt })) } });
    await click(host.querySelector('[data-view-list="failed"] button')!);
    expect(host.querySelectorAll('[data-my-walkthroughs] > li')).toHaveLength(myWalkthroughs.length);
    expect(asked('/api/me/learn/progress/walkthroughs')).toHaveLength(2);
  });

  it('a list answering no rows draws its empty end, and one answering signed out asks to sign in again', async () => {
    hint.present = true;
    listRoutes({ fixes: { fixes: [], end: { openIssues: 12, email: null } } });
    await draw('fixes');
    expect(host.querySelector('[data-view-empty]')?.getAttribute('data-view-empty')).toBe('fixes-issues');

    act(() => root.unmount());
    root = createRoot(host);
    fetchMock.mockImplementation(async (path: string) =>
      path === '/api/me/learn/progress/fixes'
        ? json({ fixes: null, end: null, signedOut: true })
        : json({ progress: myProgress, signedOut: false }),
    );
    await draw('fixes');
    expect(stateOf()).toBe('ended');
  });
});
