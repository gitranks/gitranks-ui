import { afterEach, describe, expect, it, vi } from 'vitest';

import { BROWSER_CHECK_SCRIPT, RELOADED_KEY } from './browser-check';

const ORIGIN = 'https://gitranks.test';
const MINUTE = 60_000;
const challenged = () => new Response('<html></html>', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
const forbidden = () => new Response('', { status: 403 });
const notFound = () => new Response('', { status: 404 });

type Answer = (url: string) => Response | Promise<Response>;
type PageOptions = {
  items?: Map<string, string>;
  stylesheets?: { href: string; sheet: object | null }[];
  resources?: { name: string; responseStatus?: number }[];
  storage?: 'open' | 'closed';
};

/** Runs the inline script against a fake page; returns what it did. */
function view(
  answer: Answer,
  { items = new Map(), stylesheets = [], resources = [], storage = 'open' }: PageOptions = {},
) {
  let listener: ((event: { target: unknown }) => void) | undefined;
  const fakeWindow = {
    addEventListener: (type: string, handler: typeof listener, capture: boolean) => {
      expect([type, capture]).toEqual(['error', true]);
      listener = handler;
    },
  };
  const fakeDocument = { querySelectorAll: () => stylesheets };
  const fakePerformance = { getEntriesByType: () => resources };
  const location = { href: `${ORIGIN}/profile/octocat`, origin: ORIGIN, reload: vi.fn() };
  const sessionStorage =
    storage === 'open'
      ? {
          getItem: (key: string) => items.get(key) ?? null,
          setItem: (key: string, value: string) => void items.set(key, value),
        }
      : {
          getItem: () => {
            throw new Error('blocked');
          },
          setItem: () => {
            throw new Error('blocked');
          },
        };
  const fetch = vi.fn(async (url: string, _init: RequestInit) => answer(url));
  new Function('window', 'document', 'performance', 'location', 'sessionStorage', 'fetch', BROWSER_CHECK_SCRIPT)(
    fakeWindow,
    fakeDocument,
    fakePerformance,
    location,
    sessionStorage,
    fetch,
  );
  return {
    fail: (target: unknown) => listener?.({ target }),
    asked: () => fetch.mock.calls.map(([url]) => url),
    fetch,
    reload: location.reload,
    items,
  };
}

const image = (src: string, currentSrc = src) => ({ tagName: 'IMG', currentSrc, src });
/** The target of a script's runtime error: the window, which has no tag name. */
const scriptErrorTarget = () => ({});
const settle = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => vi.restoreAllMocks());

describe('BROWSER_CHECK_SCRIPT', () => {
  it('reloads the page when the check answered an asset of the site', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const page = view(challenged);
    page.fail(image(`${ORIGIN}/_next/image?url=avatar&w=40`));
    await settle();
    expect(page.fetch).toHaveBeenCalledWith(`${ORIGIN}/_next/image?url=avatar&w=40`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(page.reload).toHaveBeenCalledOnce();
    expect(page.items.get(RELOADED_KEY)).toBe('1000000:1');
  });

  it('asks for the URL an image chose from its srcset, a stylesheet by href, a relative src against the page', async () => {
    const page = view(notFound);
    page.fail(image(`${ORIGIN}/a-1x.png`, `${ORIGIN}/a-2x.png`));
    await settle();
    page.fail({ tagName: 'LINK', href: `${ORIGIN}/_next/static/app.css` });
    await settle();
    page.fail({ tagName: 'SCRIPT', src: '/_next/static/chunk.js' });
    await settle();
    expect(page.asked()).toEqual([
      `${ORIGIN}/a-2x.png`,
      `${ORIGIN}/_next/static/app.css`,
      `${ORIGIN}/_next/static/chunk.js`,
    ]);
    expect(page.reload).not.toHaveBeenCalled();
  });

  it('leaves other origins, script errors and failures that are not the check alone', async () => {
    const page = view(challenged);
    page.fail(image('https://avatars.githubusercontent.com/u/1'));
    page.fail(scriptErrorTarget());
    page.fail(image(''));
    await settle();
    expect(page.fetch).not.toHaveBeenCalled();

    for (const answer of [notFound, forbidden]) {
      const plain = view(answer);
      plain.fail(image(`${ORIGIN}/badge/repo/acme/fastqueue/rank.svg`));
      await settle();
      expect(plain.reload).not.toHaveBeenCalled();
    }
  });

  it('asks once while many assets fail together', async () => {
    const page = view(challenged);
    page.fail(image(`${ORIGIN}/a.svg`));
    page.fail(image(`${ORIGIN}/b.svg`));
    page.fail(image(`${ORIGIN}/c.svg`));
    await settle();
    expect(page.asked()).toEqual([`${ORIGIN}/a.svg`]);
    expect(page.reload).toHaveBeenCalledOnce();
  });

  it('asks next about the latest failure that came during an ask that was not the check', async () => {
    const page = view((url) => (url.endsWith('/missing.png') ? notFound() : challenged()));
    page.fail(image(`${ORIGIN}/missing.png`));
    page.fail(image(`${ORIGIN}/a.svg`));
    page.fail(image(`${ORIGIN}/b.svg`));
    await settle();
    await settle();
    expect(page.asked()).toEqual([`${ORIGIN}/missing.png`, `${ORIGIN}/b.svg`]);
    expect(page.reload).toHaveBeenCalledOnce();
  });

  it('asks at start about a stylesheet that did not load, or else a resource answered with 403', async () => {
    const css = view(challenged, {
      stylesheets: [
        { href: `${ORIGIN}/_next/static/ok.css`, sheet: {} },
        { href: 'https://fonts.example/x.css', sheet: null },
        { href: `${ORIGIN}/_next/static/app.css`, sheet: null },
      ],
      resources: [{ name: `${ORIGIN}/_next/static/chunk.js`, responseStatus: 403 }],
    });
    await settle();
    expect(css.asked()).toEqual([`${ORIGIN}/_next/static/app.css`]);
    expect(css.reload).toHaveBeenCalledOnce();

    const chunk = view(challenged, {
      resources: [
        { name: `${ORIGIN}/_next/static/ok.js`, responseStatus: 200 },
        { name: 'https://www.googletagmanager.com/gtag.js', responseStatus: 403 },
        { name: `${ORIGIN}/_next/static/chunk.js`, responseStatus: 403 },
      ],
    });
    await settle();
    expect(chunk.asked()).toEqual([`${ORIGIN}/_next/static/chunk.js`]);

    const clean = view(challenged, { resources: [{ name: `${ORIGIN}/a.js` }] });
    await settle();
    expect(clean.fetch).not.toHaveBeenCalled();
  });

  it('waits twice as long before each next reload, and starts over after half an hour without one', async () => {
    const now = vi.spyOn(Date, 'now');
    const items = new Map<string, string>();
    const reloadAt = async (time: number) => {
      now.mockReturnValue(time);
      const page = view(challenged, { items });
      page.fail(image(`${ORIGIN}/a.svg`));
      await settle();
      return page.reload.mock.calls.length === 1;
    };

    expect(await reloadAt(0 * MINUTE + 1)).toBe(true);
    expect(await reloadAt(1 * MINUTE)).toBe(false);
    expect(await reloadAt(2 * MINUTE + 1)).toBe(true);
    expect(await reloadAt(5 * MINUTE)).toBe(false);
    expect(await reloadAt(6 * MINUTE + 1)).toBe(true);
    expect(items.get(RELOADED_KEY)).toBe(`${6 * MINUTE + 1}:3`);
    expect(await reloadAt(37 * MINUTE)).toBe(true);
    expect(items.get(RELOADED_KEY)).toBe(`${37 * MINUTE}:1`);
  });

  it('never reloads when the ask fails or storage is closed', async () => {
    const offline = view(() => Promise.reject(new TypeError('offline')));
    offline.fail(image(`${ORIGIN}/a.svg`));
    await settle();
    expect(offline.reload).not.toHaveBeenCalled();

    const closed = view(challenged, { storage: 'closed' });
    closed.fail(image(`${ORIGIN}/a.svg`));
    await settle();
    expect(closed.fetch).toHaveBeenCalledOnce();
    expect(closed.reload).not.toHaveBeenCalled();
  });
});
