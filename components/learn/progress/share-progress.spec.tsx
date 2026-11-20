// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tracker = vi.hoisted(() => ({ reportLearnEvent: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);

const { ShareProgress } = await import('./share-progress');
const { progressCounts } = await import('@/lib/learn/progress/__fixtures__/progress');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const URL = 'https://gitranks.com/learn/progress/octocat';
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

const press = () => act(async () => container.querySelector('button')?.click());
const render = () =>
  act(async () => root.render(<ShareProgress url={URL} counts={progressCounts} publicCounts={progressCounts} />));
const clipboard = (writeText: (text: string) => Promise<void>) =>
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

describe('the Share control', () => {
  it('copies the public link, says so, and counts the press', async () => {
    const writeText = vi.fn(async () => undefined);
    clipboard(writeText);
    await render();
    await press();
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(container.querySelector('button')?.textContent).toBe('Link copied');
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_click',
      event: 'progress_share',
      source: 'learn_progress',
    });
  });

  it('shows the link in a field to select when the browser refuses to copy, with Copy to try again', async () => {
    clipboard(async () => {
      throw new Error('denied');
    });
    await render();
    await press();
    expect(container.querySelector<HTMLInputElement>('input')?.value).toBe(URL);
    expect(container.querySelector('button')?.textContent).toBe('Copy');
    const writeText = vi.fn(async () => undefined);
    clipboard(writeText);
    await press();
    expect(writeText).toHaveBeenCalledWith(URL);
    expect(container.querySelector('button')?.textContent).toBe('Link copied');
  });
});
