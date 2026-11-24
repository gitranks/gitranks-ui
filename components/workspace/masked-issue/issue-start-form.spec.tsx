// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IssueStartForm, type IssueStartFormProps } from './issue-start-form';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The radios measure themselves; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

let container: HTMLDivElement;
let root: Root;
const writeText = vi.fn(async () => {});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  writeText.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const URL = 'https://github.com/acme/notebook/issues/1290';
const render = (node: ReactNode) => act(async () => root.render(node));
const form = (props: Partial<IssueStartFormProps> = {}) =>
  render(
    <IssueStartForm
      from="learn"
      issueUrl={URL}
      agents={{ own: true, hosted: false }}
      ownName="Claude Code"
      {...props}
    />,
  );
const steps = () => [...container.querySelectorAll('[data-step] h3')].map((each) => each.textContent);
const prompt = () => container.querySelector('[data-prompt]')?.textContent;
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find(
    (each) => each.textContent?.replace('⏎', '').trim() === label,
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error(`No button`);
    element.click();
  });
const radio = (label: string) =>
  [...container.querySelectorAll('label')]
    .find((each) => each.textContent?.includes(label))
    ?.querySelector<HTMLButtonElement>('[role="radio"]') ?? null;
const enter = () =>
  act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });

describe('Start fixing it, from Learn', () => {
  it('chooses how first, with the walkthrough, and the prompt changes in place', async () => {
    await form();
    expect(steps()).toEqual(['How', 'Your agent', 'Paste this in Claude Code']);
    expect(radio('Fix it and teach me')?.getAttribute('aria-checked')).toBe('true');
    expect(prompt()).toBe(`Fix ${URL} with GitRanks Learn and teach me`);
    expect(container.textContent).toContain('Claude Code is connected. Change');
    await press(radio('Just fix it'));
    expect(prompt()).toBe(`Fix ${URL} with GitRanks`);
  });

  it('never offers the hosted agent: with it alone, the agent is connected first', async () => {
    await form({ agents: { own: false, hosted: true }, connect: <p data-connect="">connect steps</p> });
    expect(steps()).toEqual(['How', 'Connect your agent', 'Paste one prompt in your agent']);
    expect(container.querySelector('[data-connect]')).not.toBeNull();
    expect(container.querySelector('[data-step="3"]')?.getAttribute('aria-disabled')).toBe('true');
    expect(container.textContent).toContain('Shows when your agent is connected.');
    expect(button('Start with the hosted agent')).toBeNull();
  });

  it('copies the prompt, says what happens next, and turns the button into Copy again', async () => {
    const onCopy = vi.fn();
    await form({ onCopy });
    await press(button('Copy the prompt'));
    expect(writeText).toHaveBeenCalledWith(`Fix ${URL} with GitRanks Learn and teach me`);
    expect(onCopy).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Copied. Waiting for Claude Code. The issue is now held for 30 minutes.',
    );
    expect(button('Copy again')).not.toBeNull();
    // A second copy copies again, and tells nobody: the 30 minutes started with the first.
    await press(button('Copy again'));
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('copies with Enter while nothing else has the focus', async () => {
    await form();
    await enter();
    expect(writeText).toHaveBeenCalledOnce();
  });
});

describe('Start fixing it, from Contribute', () => {
  it('has no choice of how and no word about the walkthrough', async () => {
    await form({ from: 'contribute' });
    expect(steps()).toEqual(['Your agent', 'Paste this in Claude Code']);
    expect(prompt()).toBe(`Fix ${URL} with GitRanks`);
    expect(container.textContent).not.toMatch(/walkthrough/i);
  });

  it('offers the walkthrough in one quiet line to a person who also uses Learn', async () => {
    await form({ from: 'contribute', alsoLearn: true });
    const line = container.querySelector('[data-walkthrough-line]');
    expect(line?.textContent).toBe('You also use GitRanks Learn. Add the walkthrough to this fix');
    await press(button('Add the walkthrough to this fix'));
    expect(prompt()).toBe(`Fix ${URL} with GitRanks Learn and teach me`);
    expect(container.querySelector('[data-walkthrough-line]')?.textContent).toBe(
      'The walkthrough is added to this fix. Leave it out',
    );
  });

  it('starts the hosted agent with one button when it is the only one', async () => {
    const onHostedStart = vi.fn();
    await form({ from: 'contribute', agents: { own: false, hosted: true }, onHostedStart });
    expect(steps()).toEqual(['Your agent', 'Start']);
    expect(container.textContent).toContain('The hosted agent, on your Claude key. It stops at the caps you set.');
    expect(prompt()).toBeUndefined();
    await press(button('Start with the hosted agent'));
    expect(onHostedStart).toHaveBeenCalledOnce();
  });

  it('makes the agent a choice of two tiles when both are connected', async () => {
    await form({ from: 'contribute', agents: { own: true, hosted: true } });
    expect(radio('My own agent')?.getAttribute('aria-checked')).toBe('true');
    expect(prompt()).toBe(`Fix ${URL} with GitRanks`);
    await press(radio('The hosted agent'));
    expect(steps()).toEqual(['Your agent', 'Start']);
    expect(button('Start with the hosted agent')).not.toBeNull();
  });

  it('connects an agent first when none is connected, the same as from Learn', async () => {
    await form({ from: 'contribute', agents: { own: false, hosted: false } });
    expect(steps()).toEqual(['Connect your agent', 'Paste one prompt in your agent']);
  });

  it('says so when too many pull requests wait, with nothing to paste', async () => {
    await form({ from: 'contribute', waitingPrs: 3 });
    expect(prompt()).toBeUndefined();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      '3 of your pull requests are waiting on maintainers. A new one can start when one is merged or closed. Change the limit in Settings',
    );
    expect(button('Change the limit in Settings')?.getAttribute('href')).toBe('/my/settings/pull-requests#open');
    await enter();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('says it of one pull request in the singular', async () => {
    await form({ from: 'contribute', waitingPrs: 1 });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Your pull request is waiting on maintainers. A new one can start when it is merged or closed. Change the limit in Settings',
    );
  });
});

describe('Start fixing it, an issue kept for people who are learning', () => {
  it('from Learn, has no "How" step: the walkthrough is always on, and one line says so', async () => {
    await form({ learnOnly: true });
    expect(steps()).toEqual(['Your agent', 'Paste this in Claude Code']);
    expect(radio('Just fix it')).toBeNull();
    expect(prompt()).toBe(`Fix ${URL} with GitRanks Learn and teach me`);
    expect(container.querySelector('[data-learn-only]')?.textContent).toBe(
      'Your agent fixes it and writes the walkthrough. You answer a few questions, then send the pull request. This issue is kept for people who are learning, so it always comes with its walkthrough.',
    );
    await enter();
    expect(writeText).toHaveBeenCalledWith(`Fix ${URL} with GitRanks Learn and teach me`);
  });

  it('from Learn with no agent connected, the connect step comes first', async () => {
    await form({ learnOnly: true, agents: { own: false, hosted: false } });
    expect(steps()).toEqual(['Connect your agent', 'Paste one prompt in your agent']);
  });

  it('from Contribute, changes nothing', async () => {
    await form({ from: 'contribute', learnOnly: true });
    expect(steps()).toEqual(['Your agent', 'Paste this in Claude Code']);
    expect(prompt()).toBe(`Fix ${URL} with GitRanks`);
    expect(container.querySelector('[data-learn-only]')).toBeNull();
    expect(container.textContent).not.toMatch(/walkthrough/i);
  });
});
