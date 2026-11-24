// @vitest-environment jsdom
import { useSession } from 'next-auth/react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RETRY_FIRST_MS, RETRY_MAX_MS, readSession, SessionProvider } from './session-provider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', async (original) => ({
  ...(await original<typeof import('@/lib/session-hint')>()),
  hasSessionHint: () => hint.present,
}));

const PERSON = { user: { name: 'Octo Cat', githubLogin: 'octocat' }, expires: '2999-01-01T00:00:00.000Z' };

const person = () => Response.json(PERSON);
const nobody = () => Response.json(null);
const limited = () => new Response('<html>Too many requests</html>', { status: 429 });
const broken = () => new Response('{"message":"oops"}', { status: 502 });

/** What the page shows: the status and who is signed in. */
function Probe() {
  const { data, status } = useSession();
  return (
    <output>
      {status}:{data?.user?.githubLogin ?? String(data)}
    </output>
  );
}

let container: HTMLDivElement;
let root: Root;
let answers: (() => Response | Promise<Response>)[];
let fetchMock: ReturnType<typeof vi.fn>;

const shown = () => container.querySelector('output')?.textContent;

/** Lets the reads on their way answer. */
const settle = () => act(async () => {});

/** Whether the tab is shown, as the browser says. */
let visibility: 'visible' | 'hidden' = 'visible';

/** Shows the tab again, as switching back to it does. */
const showTab = () =>
  act(async () => {
    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
  });

/** Another tab of the site says the session changed there (Auth.js's own message). */
const tell = (trigger: 'signout' | 'getSession') =>
  act(async () => {
    const other = new BroadcastChannel('next-auth');
    other.postMessage({ event: 'session', data: { trigger } });
    other.close();
    await new Promise((done) => setTimeout(done, 20));
  });

/** Whether the page's root holds the mark the hint-driven parts are drawn by. */
const marked = () => document.documentElement.hasAttribute('data-has-session');

beforeEach(() => {
  hint.present = true;
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  document.documentElement.removeAttribute('data-has-session');
  answers = [];
  fetchMock = vi.fn(async () => {
    const next = answers.shift();
    if (!next) throw new Error('no answer left');
    return next();
  });
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const mount = async () => {
  await act(async () =>
    root.render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    ),
  );
  await settle();
};

describe('readSession', () => {
  it('counts only a 2xx answer: a person, or nobody', async () => {
    answers.push(
      person,
      nobody,
      () => Response.json({}),
      limited,
      broken,
      () => new Response('not json'),
    );
    expect(await readSession()).toEqual({ ok: true, session: PERSON });
    expect(await readSession()).toEqual({ ok: true, session: null });
    expect(await readSession()).toEqual({ ok: true, session: null });
    expect(await readSession()).toEqual({ ok: false });
    expect(await readSession()).toEqual({ ok: false });
    expect(await readSession()).toEqual({ ok: false });
    // A network error.
    expect(await readSession()).toEqual({ ok: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ cache: 'no-store' }));
  });
});

describe('the session the page shows', () => {
  it('shows the person once the read answers', async () => {
    answers.push(person);
    await mount();
    expect(shown()).toBe('authenticated:octocat');
  });

  it('keeps a signed-in person signed in when a later read is rate-limited or fails', async () => {
    answers.push(person, limited);
    await mount();
    await showTab();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('authenticated:octocat');

    answers.push(broken);
    await showTab();
    await settle();
    expect(shown()).toBe('authenticated:octocat');

    // A network error, too.
    await showTab();
    await settle();
    expect(shown()).toBe('authenticated:octocat');
  });

  it('never shows a signed-in browser as signed out when the first read fails, and asks again later', async () => {
    vi.useFakeTimers();
    // The spread at its middle: each wait as it is.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    answers.push(limited);
    await mount();
    expect(shown()).toBe('loading:undefined');

    answers.push(broken);
    await act(async () => vi.advanceTimersByTimeAsync(RETRY_FIRST_MS));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('loading:undefined');

    // The wait doubles: nothing more at the first wait again, the read at twice it.
    answers.push(person);
    await act(async () => vi.advanceTimersByTimeAsync(RETRY_FIRST_MS));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => vi.advanceTimersByTimeAsync(RETRY_FIRST_MS));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(shown()).toBe('authenticated:octocat');
  });

  it('asks again when the tab is shown after a failed read', async () => {
    answers.push(limited, person);
    await mount();
    expect(shown()).toBe('loading:undefined');
    await showTab();
    await settle();
    expect(shown()).toBe('authenticated:octocat');
  });

  it('shows a sign-out: a proper answer with nobody', async () => {
    answers.push(person, nobody);
    await mount();
    expect(shown()).toBe('authenticated:octocat');
    await showTab();
    await settle();
    expect(shown()).toBe('unauthenticated:null');
  });

  it('shows a sign-out in another tab at once, even while reads here fail', async () => {
    answers.push(person, limited);
    await mount();
    expect(shown()).toBe('authenticated:octocat');
    await tell('signout');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('unauthenticated:null');
    expect(marked()).toBe(false);
  });

  it('reads at once when another tab says the session changed, and so a sign-in there shows here', async () => {
    answers.push(nobody, person);
    await mount();
    expect(shown()).toBe('unauthenticated:null');
    await tell('getSession');
    await settle();
    expect(shown()).toBe('authenticated:octocat');
  });

  it('leaves a hidden tab to read when it is shown, so many open tabs do not ask together', async () => {
    answers.push(person);
    await mount();
    visibility = 'hidden';
    await tell('getSession');
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    answers.push(nobody);
    await showTab();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('unauthenticated:null');
  });

  it('spreads the wait before asking again, between half and one and a half times it', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    answers.push(limited, person);
    await mount();
    await act(async () => vi.advanceTimersByTimeAsync(RETRY_FIRST_MS / 2 - 1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('authenticated:octocat');
  });

  it("keeps the root's mark in step with each proper answer, and leaves it on a failed one", async () => {
    answers.push(person, limited, nobody);
    await mount();
    expect(marked()).toBe(true);
    await showTab();
    await settle();
    expect(marked()).toBe(true);
    await showTab();
    await settle();
    expect(marked()).toBe(false);
  });

  it('drops the mark in a browser without the hint', async () => {
    hint.present = false;
    document.documentElement.setAttribute('data-has-session', '');
    await mount();
    expect(marked()).toBe(false);
  });

  it('asks nothing more once unmounted, even when a read on its way fails', async () => {
    vi.useFakeTimers();
    let answer: (res: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((done) => (answer = done)));
    await mount();
    await act(async () => root.unmount());
    await act(async () => answer(limited()));
    await act(async () => vi.advanceTimersByTimeAsync(RETRY_MAX_MS * 2));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The spec's own unmount runs once more after this.
    root = createRoot(container);
  });

  it('asks nothing without the session hint: signed out', async () => {
    hint.present = false;
    await mount();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(shown()).toBe('unauthenticated:null');
    // A signed-out tab shown again asks nothing either.
    await showTab();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
