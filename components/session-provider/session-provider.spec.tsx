// @vitest-environment jsdom
import { useSession } from 'next-auth/react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RETRY_FIRST_MS, readSession, SessionProvider } from './session-provider';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

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

/** Shows the tab again, as switching back to it does. */
const showTab = () =>
  act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
  });

beforeEach(() => {
  hint.present = true;
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

  it('shows a sign-out in another tab, heard on the cross-tab channel', async () => {
    answers.push(person, nobody);
    await mount();
    const other = new BroadcastChannel('next-auth');
    await act(async () => {
      other.postMessage({ event: 'session', data: { trigger: 'signout' } });
      await new Promise((done) => setTimeout(done, 20));
    });
    await settle();
    other.close();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(shown()).toBe('unauthenticated:null');
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
