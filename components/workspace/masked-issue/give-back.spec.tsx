// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GivenBack, NotForMe } from './give-back';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
});

const render = (node: ReactNode) => act(async () => root.render(node));
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find(
    (each) => each.textContent?.replace('⏎', '').trim() === label,
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });
const statuses = () => [...container.querySelectorAll('[role="status"]')].map((each) => each.textContent);
const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
const type = (value: string) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });

describe('Not for me', () => {
  it('is two lines and one button that gives the issue back', async () => {
    const onGiveBack = vi.fn();
    await render(<NotForMe onGiveBack={onGiveBack} />);
    expect(container.querySelector('h2')?.textContent).toBe('Not for me');
    expect(container.textContent).toContain('Give the issue back. It goes to the others at once');
    await press(button('Give it back'));
    expect(onGiveBack).toHaveBeenCalledOnce();
  });

  it('waits in its place while it gives the issue back', async () => {
    const onGiveBack = vi.fn();
    await render(<NotForMe onGiveBack={onGiveBack} sending />);
    await press(button('Giving it back…'));
    expect(onGiveBack).not.toHaveBeenCalled();
  });
});

describe('after giving back', () => {
  it('offers the six reasons, none pressed, and the note, with nothing to fill in', async () => {
    await render(<GivenBack backHref="/learn/earlier" />);
    expect(container.querySelector('h1')?.textContent).toBe('You gave this issue back');
    const reasons = [...container.querySelectorAll('[aria-pressed]')];
    expect(reasons.map((each) => each.textContent)).toEqual([
      'Someone is already working on it',
      'It is already fixed',
      'Not a project for me',
      'Too hard for me',
      'The issue is not clear',
      'Wrong language or lesson',
    ]);
    expect(reasons.every((each) => each.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(button('Save the note')?.hasAttribute('disabled')).toBe(true);
    expect(button('Back to Issues')?.getAttribute('href')).toBe('/learn/earlier');
    expect(container.textContent).toContain('The next issue has taken its place.');
  });

  it('saves each reason when it is pressed, on and off, and says so', async () => {
    const onReason = vi.fn(async () => true);
    await render(<GivenBack backHref="/learn/earlier" onReason={onReason} />);
    await press(button('It is already fixed'));
    expect(onReason).toHaveBeenLastCalledWith('FIXED', true);
    expect(button('It is already fixed')?.getAttribute('aria-pressed')).toBe('true');
    expect(statuses()[0]).toBe('Saved.');
    await press(button('It is already fixed'));
    expect(onReason).toHaveBeenLastCalledWith('FIXED', false);
    expect(button('It is already fixed')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('lets a reason go back when it was not saved', async () => {
    await render(<GivenBack backHref="/learn/earlier" onReason={async () => false} />);
    await press(button('Too hard for me'));
    expect(button('Too hard for me')?.getAttribute('aria-pressed')).toBe('false');
    expect(statuses()[0]).toBe('Not saved. Try again.');
  });

  it('shows the reasons and the note saved before', async () => {
    await render(<GivenBack backHref="/learn/earlier" reasons={['TAKEN', 'UNCLEAR']} note="Planned rewrite." />);
    const pressed = [...container.querySelectorAll('[aria-pressed="true"]')].map((each) => each.textContent);
    expect(pressed).toEqual(['Someone is already working on it', 'The issue is not clear']);
    expect(textarea().value).toBe('Planned rewrite.');
    expect(button('Save the note')?.hasAttribute('disabled')).toBe(true);
  });

  it('saves the note with its own button', async () => {
    const onNote = vi.fn(async () => true);
    await render(<GivenBack backHref="/learn/earlier" onNote={onNote} />);
    await type('  A rewrite of the sidebar is planned.  ');
    await press(button('Save the note'));
    expect(onNote).toHaveBeenCalledWith('A rewrite of the sidebar is planned.');
    expect(statuses()[1]).toBe('Saved.');
    expect(button('Save the note')?.hasAttribute('disabled')).toBe(true);
    expect(textarea().maxLength).toBe(1000);
  });
});
