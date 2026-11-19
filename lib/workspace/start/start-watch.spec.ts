import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { START_FALLBACK_ASK_MS, START_WAIT_FOR_MS, startShownWait } from './start-watch';

/** A page whose shown state the test sets, firing `visibilitychange` as a browser does. */
function pageOf(visible = true) {
  const target = new EventTarget();
  const document = {
    visibilityState: visible ? 'visible' : 'hidden',
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  } as unknown as Document;
  const show = (shown: boolean) => {
    (document as { visibilityState: string }).visibilityState = shown ? 'visible' : 'hidden';
    target.dispatchEvent(new Event('visibilitychange'));
  };
  return { document, show };
}

describe("step 3's 30 minutes", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('times out once after 30 minutes of the page shown', () => {
    const { document } = pageOf();
    const onTimeout = vi.fn();
    startShownWait({ onTimeout, onShown: vi.fn() }, { document });
    vi.advanceTimersByTime(START_WAIT_FOR_MS - 1);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(START_WAIT_FOR_MS * 2);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not count hidden time, and asks once each time the page is shown again', () => {
    const { document, show } = pageOf();
    const onTimeout = vi.fn();
    const onShown = vi.fn();
    startShownWait({ onTimeout, onShown }, { document });
    vi.advanceTimersByTime(START_WAIT_FOR_MS / 2);
    show(false);
    vi.advanceTimersByTime(START_WAIT_FOR_MS * 3);
    expect(onTimeout).not.toHaveBeenCalled();
    show(true);
    expect(onShown).toHaveBeenCalledTimes(1);
    // A second "shown" while shown is not a showing.
    show(true);
    expect(onShown).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(START_WAIT_FOR_MS / 2 - 1);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('starts counting only once a hidden page is shown', () => {
    const { document, show } = pageOf(false);
    const onTimeout = vi.fn();
    startShownWait({ onTimeout, onShown: vi.fn() }, { document });
    vi.advanceTimersByTime(START_WAIT_FOR_MS * 2);
    expect(onTimeout).not.toHaveBeenCalled();
    show(true);
    vi.advanceTimersByTime(START_WAIT_FOR_MS);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('ticks every 10 seconds while shown, never while hidden or after the 30 minutes', () => {
    const { document, show } = pageOf();
    const onTick = vi.fn();
    startShownWait({ onTimeout: vi.fn(), onShown: vi.fn(), onTick }, { document });
    vi.advanceTimersByTime(START_FALLBACK_ASK_MS * 2);
    expect(onTick).toHaveBeenCalledTimes(2);
    show(false);
    vi.advanceTimersByTime(START_FALLBACK_ASK_MS * 2);
    expect(onTick).toHaveBeenCalledTimes(2);
    show(true);
    vi.advanceTimersByTime(START_WAIT_FOR_MS * 2);
    const ticked = onTick.mock.calls.length;
    vi.advanceTimersByTime(START_FALLBACK_ASK_MS * 5);
    expect(onTick).toHaveBeenCalledTimes(ticked);
  });

  it('does nothing more once stopped', () => {
    const { document, show } = pageOf();
    const onTimeout = vi.fn();
    const onShown = vi.fn();
    const wait = startShownWait({ onTimeout, onShown }, { document });
    wait.stop();
    show(false);
    show(true);
    vi.advanceTimersByTime(START_WAIT_FOR_MS * 2);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(onShown).not.toHaveBeenCalled();
  });
});
