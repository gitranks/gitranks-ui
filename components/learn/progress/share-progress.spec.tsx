// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tracker = vi.hoisted(() => ({ reportLearnEvent: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);

const { SHARE_NOT_YET_TEXT, ShareProgress } = await import('./share-progress');

import type { ProgressShare } from '@/lib/learn/progress/progress.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PATH = '/profile/octocat/skills';
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const render = (state: ProgressShare['state']) =>
  act(async () => root.render(<ShareProgress share={{ state, path: PATH }} />));
const words = () => container.textContent?.replace(/\s+/g, ' ').trim();
const links = () => [...container.querySelectorAll('a')].map((link) => link.getAttribute('href'));

describe('Your progress’ Share', () => {
  it('copies the Skills page’s link while everyone can see it, and counts the press', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await render('public');
    expect(container.querySelector('[data-share="public"]')).not.toBeNull();
    expect(words()).toContain('Everyone can see your Skills page.');
    expect(links()).toEqual([PATH]);
    await act(async () => container.querySelector('button')?.click());
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}${PATH}`);
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_click',
      event: 'progress_share',
      source: 'learn_progress',
    });
  });

  it('says only its owner can see a hidden page, and leads there to show it, with nothing to copy', async () => {
    await render('hidden');
    expect(container.querySelector('[data-share="hidden"]')).not.toBeNull();
    expect(words()).toBe('Only you can see your Skills page. Open it to show it to everyone.');
    expect(links()).toEqual([PATH]);
    expect(container.querySelector('button')).toBeNull();
  });

  it('says it can be shared later while nothing is on the page', async () => {
    await render('not-yet');
    expect(container.querySelector('[data-share="not-yet"]')).not.toBeNull();
    expect(words()).toBe(SHARE_NOT_YET_TEXT);
    expect(links()).toEqual([]);
    expect(container.querySelector('button')).toBeNull();
  });
});
