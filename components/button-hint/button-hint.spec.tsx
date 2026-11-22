// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ButtonHint } from './button-hint';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Radix measures an open tooltip's trigger; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = () => container.querySelector('button') as HTMLButtonElement;
const tooltip = () => document.querySelector('[data-slot="tooltip-content"]');
// React hears enter and leave through pointerover and pointerout.
const pointer = (type: 'pointerover' | 'pointerout', pointerType: string) => {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { pointerType });
  act(() => {
    button().dispatchEvent(event);
  });
};

describe('ButtonHint', () => {
  it('describes the button for screen readers and keeps the hint off the page on hover screens', () => {
    act(() =>
      root.render(
        <ButtonHint hint="Daily updates on.">
          <button type="button">Refresh now</button>
        </ButtonHint>,
      ),
    );

    const describedBy = button().getAttribute('aria-describedby');
    expect(describedBy && document.getElementById(describedBy)?.textContent).toBe('Daily updates on.');
    expect(document.getElementById(describedBy ?? '')?.className).toBe('sr-only');
    expect(tooltip()).toBeNull();
  });

  it('shows a line on screens without hover when the button acts at once', () => {
    act(() =>
      root.render(
        <ButtonHint hint="Update up to 3 repos or packages daily." actsAtOnce>
          <button type="button">Update daily</button>
        </ButtonHint>,
      ),
    );

    const line = document.getElementById(button().getAttribute('aria-describedby') ?? '');
    expect(line?.className).toContain('text-xs');
    expect(line?.className).toContain('[@media(hover:hover)_and_(pointer:fine)]:sr-only');
  });

  it('opens on the mouse, and never on focus (as when a dialog gives focus back)', () => {
    act(() =>
      root.render(
        <ButtonHint hint="Daily updates on.">
          <button type="button">Refresh now</button>
        </ButtonHint>,
      ),
    );

    act(() => button().focus());
    expect(tooltip()).toBeNull();

    pointer('pointerover', 'touch');
    expect(tooltip()).toBeNull();

    pointer('pointerover', 'mouse');
    expect(tooltip()?.textContent).toContain('Daily updates on.');

    pointer('pointerout', 'mouse');
    expect(tooltip()?.getAttribute('data-state') ?? 'closed').toBe('closed');
  });

  it('keeps the same button when the hint comes and goes, so focus stays on it', () => {
    let setHint: (hint?: string) => void = () => {};
    const Host = () => {
      const [hint, set] = useState<string | undefined>('Update up to 3 repos or packages daily.');
      setHint = set;
      return (
        <ButtonHint hint={hint}>
          <button type="button">Update daily</button>
        </ButtonHint>
      );
    };
    act(() => root.render(<Host />));

    const before = button();
    act(() => before.focus());
    act(() => setHint(undefined));

    expect(button()).toBe(before);
    expect(document.activeElement).toBe(before);
    expect(button().hasAttribute('aria-describedby')).toBe(false);
  });
});
