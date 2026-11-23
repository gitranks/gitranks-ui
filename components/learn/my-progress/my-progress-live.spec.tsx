// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, signIn } = vi.hoisted(() => ({ hint: { present: false }, signIn: vi.fn(async () => undefined) }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
vi.mock('next-auth/react', () => ({ signIn }));

const { MyProgressLive, readHistory, readMyProgress } = await import('./my-progress-live');
const { historyEarlier, historyFirst, myProgress, myProgressEmpty } = await import(
  '@/lib/learn/__fixtures__/my-progress'
);

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

const draw = (view: 'courses' | 'history' = 'courses', day: string | null = null) =>
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
});
