import { beforeEach, describe, expect, it, vi } from 'vitest';

import { openInBrowserOf } from './open-in-browser';

const OPEN_PATH = '/api/me/first/open';
const OTHER_PATH = '/api/me/second/open';

const answers = (open: Record<string, unknown>) =>
  vi.fn(async (path: string) => new Response(JSON.stringify({ open: open[path] })));

describe('open to the viewer, asked in the browser', () => {
  beforeEach(() => {
    openInBrowserOf(OPEN_PATH).reset();
    openInBrowserOf(OTHER_PATH).reset();
    vi.unstubAllGlobals();
  });

  it('asks its path once per login, and remembers each answer', async () => {
    const fetch = answers({ [OPEN_PATH]: true });
    vi.stubGlobal('fetch', fetch);
    const gate = openInBrowserOf(OPEN_PATH);

    expect(gate.known('octocat')).toBeUndefined();
    expect(await Promise.all([gate.ask('octocat'), gate.ask('octocat')])).toEqual([true, true]);
    expect(await gate.ask('octocat')).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(OPEN_PATH);
    expect(gate.known('octocat')).toBe(true);

    expect(gate.known('hubot')).toBeUndefined();
    expect(await gate.ask('hubot')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('is closed without a login, and never asks', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const gate = openInBrowserOf(OPEN_PATH);

    expect(await gate.ask(null)).toBe(false);
    expect(await gate.ask(undefined)).toBe(false);
    expect(await gate.ask('')).toBe(false);
    expect(gate.known(null)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('is closed on an error answer, when the request fails, and on anything but `open: true`', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const gate = openInBrowserOf(OPEN_PATH);

    fetch.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect(await gate.ask('a')).toBe(false);
    fetch.mockRejectedValueOnce(new Error('offline'));
    expect(await gate.ask('b')).toBe(false);
    fetch.mockResolvedValueOnce(new Response('not json'));
    expect(await gate.ask('c')).toBe(false);
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ open: 'yes' })));
    expect(await gate.ask('d')).toBe(false);

    expect(gate.known('a')).toBe(false);
    expect(gate.known('b')).toBe(false);
  });

  it('keeps answers per path: two paths never share one, the same path always does', async () => {
    const fetch = answers({ [OPEN_PATH]: true, [OTHER_PATH]: false });
    vi.stubGlobal('fetch', fetch);
    const first = openInBrowserOf(OPEN_PATH);
    const second = openInBrowserOf(OTHER_PATH);

    expect(await first.ask('octocat')).toBe(true);
    expect(second.known('octocat')).toBeUndefined();
    expect(await second.ask('octocat')).toBe(false);
    expect(first.known('octocat')).toBe(true);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([OPEN_PATH, OTHER_PATH]);

    expect(openInBrowserOf(OPEN_PATH).known('octocat')).toBe(true);
    expect(await openInBrowserOf(OPEN_PATH).ask('octocat')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('forgets its own answers on reset, not the other path’s', async () => {
    const fetch = answers({ [OPEN_PATH]: true, [OTHER_PATH]: true });
    vi.stubGlobal('fetch', fetch);
    const first = openInBrowserOf(OPEN_PATH);
    const second = openInBrowserOf(OTHER_PATH);
    await Promise.all([first.ask('octocat'), second.ask('octocat')]);

    first.reset();
    expect(first.known('octocat')).toBeUndefined();
    expect(second.known('octocat')).toBe(true);
    expect(await first.ask('octocat')).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
