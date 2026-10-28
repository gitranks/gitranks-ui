import { afterEach, describe, expect, it, vi } from 'vitest';

import { BROWSER_CHECK_SCRIPT, RELOADED_KEY } from './browser-check';

const ORIGIN = 'https://gitranks.test';
const challenged = () => new Response('<html></html>', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
const notFound = () => new Response('', { status: 404 });

/** Runs the inline script against a fake page; returns what it did. */
function page(answer: () => Response | Promise<Response>, items = new Map<string, string>()) {
  let listener: ((event: { target: unknown }) => void) | undefined;
  const window = {
    addEventListener: (type: string, handler: typeof listener, capture: boolean) => {
      expect([type, capture]).toEqual(['error', true]);
      listener = handler;
    },
  };
  const location = { href: `${ORIGIN}/profile/octocat`, origin: ORIGIN, reload: vi.fn() };
  const sessionStorage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => answer());
  new Function('window', 'location', 'sessionStorage', 'fetch', BROWSER_CHECK_SCRIPT)(
    window,
    location,
    sessionStorage,
    fetch,
  );
  return {
    fail: (target: unknown) => listener?.({ target }),
    fetch,
    reload: location.reload,
    items,
  };
}

const image = (src: string) => ({ tagName: 'IMG', currentSrc: src, src });
const settle = () => new Promise((resolve) => setTimeout(resolve));

afterEach(() => vi.restoreAllMocks());

describe('BROWSER_CHECK_SCRIPT', () => {
  it('reloads the page when the check answered an asset of the site', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const it = page(challenged);
    it.fail(image(`${ORIGIN}/_next/image?url=avatar&w=40`));
    await settle();
    expect(it.fetch).toHaveBeenCalledWith(`${ORIGIN}/_next/image?url=avatar&w=40`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(it.reload).toHaveBeenCalledOnce();
    expect(it.items.get(RELOADED_KEY)).toBe('1000000');
  });

  it('reads a stylesheet by its href and a relative src against the page', async () => {
    const it = page(notFound);
    it.fail({ tagName: 'LINK', href: `${ORIGIN}/_next/static/app.css` });
    await settle();
    it.fail({ tagName: 'SCRIPT', src: '/_next/static/chunk.js' });
    await settle();
    expect(it.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${ORIGIN}/_next/static/app.css`,
      `${ORIGIN}/_next/static/chunk.js`,
    ]);
    expect(it.reload).not.toHaveBeenCalled();
  });

  it('leaves other origins, script errors and plain failures alone', async () => {
    const it = page(challenged);
    it.fail(image('https://avatars.githubusercontent.com/u/1'));
    it.fail(window());
    it.fail(image(''));
    await settle();
    expect(it.fetch).not.toHaveBeenCalled();

    const plain = page(notFound);
    plain.fail(image(`${ORIGIN}/badge/repo/acme/fastqueue/rank.svg`));
    await settle();
    expect(plain.reload).not.toHaveBeenCalled();
  });

  it('asks once while many assets fail together', async () => {
    const it = page(challenged);
    it.fail(image(`${ORIGIN}/a.svg`));
    it.fail(image(`${ORIGIN}/b.svg`));
    it.fail(image(`${ORIGIN}/c.svg`));
    await settle();
    expect(it.fetch).toHaveBeenCalledOnce();
    expect(it.reload).toHaveBeenCalledOnce();
  });

  it('does not reload again soon after a reload that did not clear the check', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const it = page(challenged, new Map([[RELOADED_KEY, String(1_000_000 - 30_000)]]));
    it.fail(image(`${ORIGIN}/a.svg`));
    await settle();
    expect(it.reload).not.toHaveBeenCalled();

    now.mockReturnValue(1_000_000 + 2 * 60_000);
    it.fail(image(`${ORIGIN}/a.svg`));
    await settle();
    expect(it.reload).toHaveBeenCalledOnce();
  });

  it('never reloads when the ask fails', async () => {
    const it = page(() => Promise.reject(new TypeError('offline')));
    it.fail(image(`${ORIGIN}/a.svg`));
    await settle();
    expect(it.reload).not.toHaveBeenCalled();
  });
});

/** An error event of a script: its target is the window, which has no tag name. */
function window() {
  return {};
}
