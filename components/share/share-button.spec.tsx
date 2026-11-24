// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShareButton } from './share-button';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PATH = '/learn/lessons/hash-sets?fact';
const URL_OF_PATH = `${window.location.origin}${PATH}`;

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
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
  Reflect.deleteProperty(window, 'matchMedia');
});

const render = (props: Partial<Parameters<typeof ShareButton>[0]> = {}) =>
  act(async () => root.render(<ShareButton href={PATH} title="Did you know?" {...props} />));
const press = () => act(async () => container.querySelector('button')?.click());
/** The words the button shows: the one of its two that is not hidden. */
const shown = () => container.querySelector('button [data-shown="true"]')?.textContent;
const status = () => container.querySelector('[role="status"]')?.textContent;
const field = () => container.querySelector<HTMLInputElement>('input');

const clipboard = (writeText: (text: string) => Promise<void>) => {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: spy }, configurable: true });
  return spy;
};
const copies = () => clipboard(async () => undefined);
const sheet = (share: (data: ShareData) => Promise<void>) => {
  const spy = vi.fn(share);
  Object.defineProperty(navigator, 'share', { value: spy, configurable: true });
  return spy;
};
const touch = (coarse: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: coarse && query === '(pointer: coarse)', media: query }),
    configurable: true,
  });

describe('the share button', () => {
  it('copies the address and reads "Link copied" for two seconds in the same button, then its words again', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const writeText = copies();
    await render();
    expect(shown()).toBe('Share');
    expect(container.querySelectorAll('button')).toHaveLength(1);
    await press();
    expect(writeText).toHaveBeenCalledWith(URL_OF_PATH);
    expect(shown()).toBe('Link copied');
    expect(status()).toBe('Link copied');
    // Both words stay laid out in the button, the other one hidden, so it keeps its size.
    const words = [...container.querySelectorAll('button [data-shown]')];
    expect(words.map((word) => [word.textContent, word.getAttribute('aria-hidden')])).toEqual([
      ['Share', 'true'],
      ['Link copied', 'false'],
    ]);
    await act(async () => vi.advanceTimersByTime(1999));
    expect(shown()).toBe('Link copied');
    await act(async () => vi.advanceTimersByTime(1));
    expect(shown()).toBe('Share');
    expect(status()).toBe('');
  });

  it('takes its own words and a full address', async () => {
    const writeText = copies();
    await render({ href: 'https://gitranks.com/profile/octocat/skills', label: 'Copy link' });
    expect(shown()).toBe('Copy link');
    await press();
    expect(writeText).toHaveBeenCalledWith('https://gitranks.com/profile/octocat/skills');
    expect(shown()).toBe('Link copied');
  });

  it('opens the share sheet instead on a touch screen that has one, and copies nothing', async () => {
    touch(true);
    const share = sheet(async () => undefined);
    const writeText = copies();
    await render();
    await press();
    expect(share).toHaveBeenCalledWith({ title: 'Did you know?', url: URL_OF_PATH });
    expect(writeText).not.toHaveBeenCalled();
    expect(shown()).toBe('Share');
  });

  it('says nothing when the share sheet is closed without sharing', async () => {
    touch(true);
    sheet(async () => {
      throw new DOMException('Share canceled', 'AbortError');
    });
    const writeText = copies();
    await render();
    await press();
    expect(writeText).not.toHaveBeenCalled();
    expect(shown()).toBe('Share');
    expect(field()).toBeNull();
  });

  it('copies when the share sheet fails to open', async () => {
    touch(true);
    sheet(async () => {
      throw new DOMException('Not allowed', 'NotAllowedError');
    });
    const writeText = copies();
    await render();
    await press();
    expect(writeText).toHaveBeenCalledWith(URL_OF_PATH);
    expect(shown()).toBe('Link copied');
  });

  it('copies with a share sheet but a mouse, and on a touch screen without one', async () => {
    touch(false);
    const share = sheet(async () => undefined);
    let writeText = copies();
    await render();
    await press();
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(URL_OF_PATH);

    Reflect.deleteProperty(navigator, 'share');
    touch(true);
    writeText = copies();
    await press();
    expect(writeText).toHaveBeenCalledWith(URL_OF_PATH);
  });

  it('shows the address in a field, focused and selected, when the browser refuses to copy, and tries again', async () => {
    clipboard(async () => {
      throw new Error('denied');
    });
    await render();
    await press();
    expect(shown()).toBe('Share');
    expect(status()).toBe('');
    const input = field();
    expect(input?.value).toBe(URL_OF_PATH);
    expect(input?.readOnly).toBe(true);
    expect(input?.getAttribute('aria-label')).toBe('The link to copy');
    expect(document.activeElement).toBe(input);
    expect([input?.selectionStart, input?.selectionEnd]).toEqual([0, URL_OF_PATH.length]);

    // Refused again, with the field already there: it takes the focus back, selected.
    container.querySelector('button')?.focus();
    input?.setSelectionRange(0, 0);
    await press();
    expect(field()).toBe(input);
    expect(document.activeElement).toBe(input);
    expect([input?.selectionStart, input?.selectionEnd]).toEqual([0, URL_OF_PATH.length]);

    const writeText = copies();
    await press();
    expect(writeText).toHaveBeenCalledWith(URL_OF_PATH);
    expect(shown()).toBe('Link copied');
    expect(field()).toBeNull();
  });
});
