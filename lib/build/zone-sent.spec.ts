// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browser = vi.hoisted(() => ({ zone: 'Europe/Berlin' as string | null }));
vi.mock('@/lib/workspace/email-settings', async (original) => ({
  ...(await original<typeof import('@/lib/workspace/email-settings')>()),
  browserTimeZone: () => browser.zone,
}));
const { setContributeEmailSettings } = vi.hoisted(() => ({ setContributeEmailSettings: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => ({ setContributeEmailSettings }));

const { zoneSent } = await import('./zone-live');

const SENT = 'gitranks:time-zone-sent';

/** A save the test settles by hand. */
function heldSave() {
  let settle: (value: unknown) => void = () => {};
  setContributeEmailSettings.mockReturnValueOnce(
    new Promise((resolve) => {
      settle = resolve;
    }),
  );
  return (value: unknown) => settle(value);
}

beforeEach(() => {
  setContributeEmailSettings.mockReset();
  window.localStorage.clear();
  browser.zone = 'Europe/Berlin';
});

afterEach(() => vi.useRealTimers());

describe("the browser's zone, saved before a page of Build reads the person's side", () => {
  it('holds every reader until the one save of a new zone settles, then remembers it', async () => {
    const settle = heldSave();
    let done = 0;
    const first = zoneSent().then(() => done++);
    const second = zoneSent().then(() => done++);
    await Promise.resolve();
    expect(done).toBe(0);
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(1);
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ timeZone: 'Europe/Berlin' });

    settle({ ok: true, data: {} });
    await Promise.all([first, second]);
    expect(done).toBe(2);
    expect(window.localStorage.getItem(SENT)).toBe('Europe/Berlin');
  });

  it('sends nothing and holds nothing when the zone was sent already, or the browser tells none', async () => {
    window.localStorage.setItem(SENT, 'Europe/Berlin');
    await zoneSent();
    browser.zone = null;
    await zoneSent();
    expect(setContributeEmailSettings).not.toHaveBeenCalled();
  });

  it('sends again after a move', async () => {
    window.localStorage.setItem(SENT, 'America/New_York');
    setContributeEmailSettings.mockResolvedValueOnce({ ok: true, data: {} });
    await zoneSent();
    expect(setContributeEmailSettings).toHaveBeenCalledWith({ timeZone: 'Europe/Berlin' });
    expect(window.localStorage.getItem(SENT)).toBe('Europe/Berlin');
  });

  it('lets the page read when the save fails, and tries again the next time', async () => {
    setContributeEmailSettings.mockRejectedValueOnce(new Error('network'));
    await zoneSent();
    expect(window.localStorage.getItem(SENT)).toBeNull();
    setContributeEmailSettings.mockResolvedValueOnce({ ok: false, error: 'INVALID' });
    await zoneSent();
    // A zone the API refused is not sent again.
    expect(window.localStorage.getItem(SENT)).toBe('Europe/Berlin');
    expect(setContributeEmailSettings).toHaveBeenCalledTimes(2);
  });

  it('does not hold the page past its wait when the save is slow', async () => {
    vi.useFakeTimers();
    const settle = heldSave();
    let done = false;
    const waiting = zoneSent(2_000).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(done).toBe(true);
    settle({ ok: true, data: {} });
  });
});
