// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/lib/workspace/actions', () => ({ readFeedComputedAt: vi.fn(async () => ({ ok: true, data: null })) }));

const { Matching } = await import('./matching');
const { MATCHING_CONTINUE_MS } = await import('@/lib/workspace/matching');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('the matching moment, opened from an issue', () => {
  it('its link to the first issue keeps the way back, and a press goes there with it', async () => {
    window.history.replaceState(null, '', '/contribute/start/agent/key?issue=q7k2m9xa');
    await act(async () => root.render(<Matching languages={[]} initialTicks={4} />));
    const link = container.querySelector<HTMLAnchorElement>('a[href^="/contribute/start/issue"]');
    expect(link?.getAttribute('href')).toBe('/contribute/start/issue?issue=q7k2m9xa');
    await act(async () => link?.click());
    expect(router.push).toHaveBeenCalledWith('/contribute/start/issue?issue=q7k2m9xa');
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('goes on by itself with the way back, and without one when the address has none', async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/contribute/start/agent/key?issue=q7k2m9xa');
    await act(async () => root.render(<Matching languages={[]} initialTicks={4} />));
    await act(async () => vi.advanceTimersByTimeAsync(MATCHING_CONTINUE_MS));
    expect(router.push).toHaveBeenCalledWith('/contribute/start/issue?issue=q7k2m9xa');

    act(() => root.unmount());
    root = createRoot(container);
    router.push.mockClear();
    window.history.replaceState(null, '', '/contribute/start/agent/key');
    await act(async () => root.render(<Matching languages={[]} initialTicks={4} />));
    await act(async () => vi.advanceTimersByTimeAsync(MATCHING_CONTINUE_MS));
    expect(router.push).toHaveBeenCalledWith('/contribute/start/issue');
  });
});
