// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useEnter, useFocusOnShow } from './use-page-keys';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

function Enter({ act: does }: { act: (() => void) | null }) {
  useEnter(does);
  return (
    <>
      <button type="button">A button</button>
      <a href="/x">Open the course</a>
      <input aria-label="A field" />
      {/* A box as Radix draws it: a control with the checkbox role. */}
      {/* biome-ignore lint/a11y/useSemanticElements: the shape Radix gives a checkbox, which Enter must leave alone. */}
      <span role="checkbox" aria-checked="false" tabIndex={0} aria-label="A box" />
      <p>Some text</p>
    </>
  );
}

const press = (target: EventTarget, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe("the page's Enter", () => {
  it('acts once for Enter on the page, and leaves Enter on a control to the control', () => {
    const does = vi.fn();
    act(() => root.render(<Enter act={does} />));
    for (const selector of ['button', 'a', 'input', '[role="checkbox"]']) {
      const event = press(host.querySelector(selector)!);
      expect(event.defaultPrevented, selector).toBe(false);
    }
    expect(does).not.toHaveBeenCalled();
    expect(press(host.querySelector('p')!).defaultPrevented).toBe(true);
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(does).toHaveBeenCalledTimes(2);
  });

  it('does nothing for a held Enter, with a modifier, another key, or one taken already', () => {
    const does = vi.fn();
    act(() => root.render(<Enter act={does} />));
    press(document.body, { repeat: true });
    for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)
      press(document.body, { [modifier]: true });
    press(document.body, { key: 'a' });
    const taken = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    taken.preventDefault();
    act(() => {
      document.body.dispatchEvent(taken);
    });
    expect(does).not.toHaveBeenCalled();
  });

  it('listens to nothing while there is nothing to do, and stops when the screen goes', () => {
    const does = vi.fn();
    act(() => root.render(<Enter act={null} />));
    expect(press(document.body).defaultPrevented).toBe(false);
    act(() => root.render(<Enter act={does} />));
    act(() => root.render(<Enter act={null} />));
    press(document.body);
    act(() => root.render(<Enter act={does} />));
    act(() => root.unmount());
    root = createRoot(host);
    press(document.body);
    expect(does).not.toHaveBeenCalled();
  });
});

function Shown({ show }: { show: boolean }) {
  const ref = useFocusOnShow<HTMLHeadingElement>(show);
  return (
    <h1 ref={ref} tabIndex={-1}>
      Title
    </h1>
  );
}

describe('the focus of a screen shown', () => {
  it('moves to its title once shown, not before', () => {
    act(() => root.render(<Shown show={false} />));
    expect(document.activeElement).not.toBe(host.querySelector('h1'));
    act(() => root.render(<Shown show />));
    expect(document.activeElement).toBe(host.querySelector('h1'));
  });
});
