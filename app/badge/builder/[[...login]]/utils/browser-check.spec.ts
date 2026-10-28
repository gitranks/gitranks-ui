import { describe, expect, it, vi } from 'vitest';

import { createBrowserCheck, RELOADED_KEY } from './browser-check';

const challenged = () => new Response('<html></html>', { status: 403, headers: { 'cf-mitigated': 'challenge' } });
const notFound = () => new Response('', { status: 404 });

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
}

function setup(answer: () => Response | Promise<Response>, at = 1_000_000) {
  const store = memoryStorage();
  let time = at;
  const ask = vi.fn(async () => answer());
  const reload = vi.fn();
  const check = createBrowserCheck({ ask, reload, storage: () => store, now: () => time });
  return { check, ask, reload, store, later: (ms: number) => (time += ms) };
}

const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('createBrowserCheck', () => {
  it('reloads the page when the check answered the image', async () => {
    const { check, ask, reload, store } = setup(challenged);
    check.onImageError('/badge/repo/acme/fastqueue/rank.svg');
    await settle();
    expect(ask).toHaveBeenCalledWith('/badge/repo/acme/fastqueue/rank.svg');
    expect(reload).toHaveBeenCalledOnce();
    expect(store.items.get(RELOADED_KEY)).toBe('1000000');
  });

  it('leaves a plain failure alone', async () => {
    const { check, reload } = setup(notFound);
    check.onImageError('/badge/repo/acme/fastqueue/rank.svg');
    await settle();
    expect(reload).not.toHaveBeenCalled();
  });

  it('asks once while many previews fail together', async () => {
    const { check, ask, reload } = setup(challenged);
    check.onImageError('/a.svg');
    check.onImageError('/b.svg');
    check.onImageError('/c.svg');
    await settle();
    expect(ask).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload again soon after a reload that did not clear the check', async () => {
    const { check, reload, store, later } = setup(challenged);
    store.setItem(RELOADED_KEY, String(1_000_000 - 30_000));
    check.onImageError('/a.svg');
    await settle();
    expect(reload).not.toHaveBeenCalled();

    later(2 * 60_000);
    check.onImageError('/a.svg');
    await settle();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('never reloads when the ask itself fails or storage is closed', async () => {
    const failing = setup(() => Promise.reject(new TypeError('offline')));
    failing.check.onImageError('/a.svg');
    await settle();
    expect(failing.reload).not.toHaveBeenCalled();

    const reload = vi.fn();
    const closed = createBrowserCheck({
      ask: async () => challenged(),
      reload,
      storage: () => {
        throw new Error('blocked');
      },
    });
    closed.onImageError('/a.svg');
    await settle();
    expect(reload).not.toHaveBeenCalled();
  });
});
