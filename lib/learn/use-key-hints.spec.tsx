// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isRealKey, keyHintsOf, resetKeyHints, useKeyHints } from './use-key-hints';

describe('the rule for key hints', () => {
  it('shows them for a mouse or a trackpad, or once a key is pressed; not for touch alone', () => {
    expect(keyHintsOf({ finePointer: true, keyPressed: false })).toBe(true);
    expect(keyHintsOf({ finePointer: false, keyPressed: true })).toBe(true);
    expect(keyHintsOf({ finePointer: false, keyPressed: false })).toBe(false);
  });

  it("counts a keyboard's key, not a phone's on-screen one or a key typed into a field", () => {
    const body = document.body;
    const input = document.createElement('input');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    const inEditable = document.createElement('span');
    editable.append(inEditable);
    expect(isRealKey({ isTrusted: true, key: 'Enter', target: body })).toBe(true);
    expect(isRealKey({ isTrusted: true, key: '1', target: null })).toBe(true);
    expect(isRealKey({ isTrusted: false, key: 'Enter', target: body })).toBe(false);
    expect(isRealKey({ isTrusted: true, key: 'Unidentified', target: body })).toBe(false);
    expect(isRealKey({ isTrusted: true, key: '', target: body })).toBe(false);
    expect(isRealKey({ isTrusted: true, key: 'a', target: input })).toBe(false);
    expect(isRealKey({ isTrusted: true, key: 'a', target: inEditable })).toBe(false);
  });
});

describe('useKeyHints in the browser', () => {
  let fine = false;
  const listeners = new Set<() => void>();
  let shown: boolean[] = [];
  const keyListeners = new Set<(event: KeyboardEvent) => void>();

  function Probe() {
    shown.push(useKeyHints());
    return null;
  }

  beforeEach(() => {
    resetKeyHints();
    shown = [];
    fine = false;
    vi.stubGlobal('matchMedia', (query: string) => ({
      media: query,
      get matches() {
        return fine;
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }));
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: unknown) => {
      if (type === 'keydown') keyListeners.add(listener as (event: KeyboardEvent) => void);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type: string, listener: unknown) => {
      if (type === 'keydown') keyListeners.delete(listener as (event: KeyboardEvent) => void);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    listeners.clear();
    keyListeners.clear();
  });

  /** A key a keyboard pressed: the page's key listener called with what the browser would give it. */
  const press = (key: string) => {
    for (const listener of keyListeners)
      listener({ isTrusted: true, key, target: document.body } as unknown as KeyboardEvent);
  };

  it('starts without hints on a touch screen, and shows them from the first real key', async () => {
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Probe />));
    expect(shown.at(-1)).toBe(false);
    await act(async () => press('Unidentified'));
    expect(shown.at(-1)).toBe(false);
    await act(async () => press('j'));
    expect(shown.at(-1)).toBe(true);
    await act(async () => root.unmount());
  });

  it('shows them for a fine pointer, and follows a change of the main pointer', async () => {
    fine = true;
    const root = createRoot(document.createElement('div'));
    await act(async () => root.render(<Probe />));
    expect(shown.at(-1)).toBe(true);
    fine = false;
    await act(async () => {
      for (const listener of listeners) listener();
    });
    expect(shown.at(-1)).toBe(false);
    await act(async () => root.unmount());
  });
});
