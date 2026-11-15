// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyUpdatesLine } from './daily-updates-line';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = new Date('2026-11-15T12:00:00Z');
const MINUTE = 60_000;

describe('DailyUpdatesLine in the browser', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers({ now: NOW });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('adds the time after mount, moves it each minute, and says "soon" once due', () => {
    const nextUpdateAt = new Date(NOW.getTime() + 5 * 60 * MINUTE).toISOString();
    act(() => root.render(<DailyUpdatesLine lead="Turned on by @octo-dev." nextUpdateAt={nextUpdateAt} />));

    expect(container.textContent).toBe('Turned on by @octo-dev. Next update in 5 h.');

    act(() => vi.advanceTimersByTime(MINUTE));
    expect(container.textContent).toBe('Turned on by @octo-dev. Next update in 4 h 59 min.');

    act(() => vi.advanceTimersByTime(5 * 60 * MINUTE));
    expect(container.textContent).toBe('Turned on by @octo-dev. Next update soon.');
  });

  it('keeps the lead alone without a time', () => {
    act(() => root.render(<DailyUpdatesLine lead="Updates daily." nextUpdateAt={null} />));
    expect(container.textContent).toBe('Updates daily.');
  });

  it('stops its clock when it unmounts', () => {
    act(() => root.render(<DailyUpdatesLine lead="Updates daily." nextUpdateAt={NOW.toISOString()} />));
    expect(vi.getTimerCount()).toBe(1);

    act(() => root.render(null));
    expect(vi.getTimerCount()).toBe(0);
  });
});
