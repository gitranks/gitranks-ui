// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applicationOf, FAST_DIFF, FOUND, NOT_FOUND, viewOf } from './__fixtures__/apply';
import {
  forgetHeroApplication,
  hasHeroApplication,
  rememberHeroApplication,
} from '@/lib/unsung-hero/hero-application-cookie';

const { resolveApplyPackage, sendApplication, cancelApplication } = vi.hoisted(() => ({
  resolveApplyPackage: vi.fn(),
  sendApplication: vi.fn(),
  cancelApplication: vi.fn(),
}));
vi.mock('./actions', () => ({ resolveApplyPackage, sendApplication, cancelApplication }));

const { ApplyPanel } = await import('./components/apply-panel');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  resolveApplyPackage.mockReset();
  sendApplication.mockReset();
  cancelApplication.mockReset();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  forgetHeroApplication();
});

/** The page's text, each text node a word apart, as a reader hears it. */
const words = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.textContent ?? '');
  return parts.join(' ').replace(/\s+/g, ' ');
};

const button = (name: string) => {
  const found = [...document.querySelectorAll('button')].find((each) => each.textContent?.trim() === name);
  if (!found) throw new Error(`no button "${name}" in: ${words()}`);
  return found;
};

const click = async (element: Element) => {
  await act(async () => {
    (element as HTMLElement).click();
  });
};

/** Types into a field the way React hears it. */
const typeInto = async (input: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

/** Lets the pending lookup or send answer. */
const settle = () => act(async () => {});

const draw = (view = viewOf()) => act(() => root.render(<ApplyPanel login="octocat" view={view} />));

describe('nominating another package', () => {
  it('looks it up once typing pauses for 400 ms, with the last text only', async () => {
    resolveApplyPackage.mockResolvedValue(FOUND);
    await draw();
    await click(button('Nominate another package →'));
    const input = container.querySelector('input') as HTMLInputElement;
    await typeInto(input, 'fast');
    await act(async () => vi.advanceTimersByTime(200));
    await typeInto(input, 'https://www.npmjs.com/package/fast-diff');
    await act(async () => vi.advanceTimersByTime(399));
    expect(resolveApplyPackage).not.toHaveBeenCalled();
    expect(words()).toContain('Looking it up…');
    await act(async () => vi.advanceTimersByTime(1));
    await settle();
    expect(resolveApplyPackage.mock.calls).toEqual([['https://www.npmjs.com/package/fast-diff']]);
    expect(words()).toContain('fast-diff npm diff-tools/fast-diff · 3.1M a week');
    expect(words()).toContain('2. Tell us about fast-diff');
  });

  it('sends it as typed, then shows the application and notes it for the avatar menu', async () => {
    resolveApplyPackage.mockResolvedValue(FOUND);
    sendApplication.mockResolvedValue({
      ok: true,
      refusal: null,
      application: applicationOf({ package: FAST_DIFF, typed: 'fast-diff', note: 'Everyone ships it.' }),
    });
    await draw();
    await click(button('Nominate another package →'));
    await typeInto(container.querySelector('input') as HTMLInputElement, 'fast-diff');
    await act(async () => vi.advanceTimersByTime(400));
    await settle();
    await typeInto(container.querySelector('textarea') as HTMLTextAreaElement, ' Everyone ships it. ');
    await click(button('Send application'));
    await settle();
    expect(sendApplication).toHaveBeenCalledWith({ typed: 'fast-diff', note: 'Everyone ships it.' });
    expect(words()).toContain('Your application In review');
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(true);
  });
});

describe('lookup answers', () => {
  const nominate = async (value: string) => {
    await click(button('Nominate another package →'));
    await typeInto(container.querySelector('input') as HTMLInputElement, value);
  };
  const status = () => document.querySelector('[role="status"][aria-live="polite"]');
  const hasSend = () =>
    [...document.querySelectorAll('button')].some((each) => each.textContent === 'Send application');

  it('a lookup that did not answer: says why, and offers no Send', async () => {
    resolveApplyPackage.mockResolvedValue({ status: 'UNAVAILABLE', packages: [] });
    await draw();
    await nominate('brand-new-pkg');
    await act(async () => vi.advanceTimersByTime(400));
    await settle();
    expect(status()?.textContent).toBe('We can’t look it up right now. It may be new to us. Try again later.');
    expect(hasSend()).toBe(false);
    expect(words()).not.toContain('Check it with your agent');
  });

  it('not found: can still be sent as typed', async () => {
    resolveApplyPackage.mockResolvedValue(NOT_FOUND);
    await draw();
    await nominate('left-padder');
    await act(async () => vi.advanceTimersByTime(400));
    await settle();
    expect(hasSend()).toBe(true);
  });

  it('one live region stays in place while what it says changes', async () => {
    resolveApplyPackage.mockResolvedValue(FOUND);
    await draw();
    await nominate('fast-diff');
    const region = status();
    expect(region?.textContent).toBe('Looking it up…');
    await act(async () => vi.advanceTimersByTime(400));
    await settle();
    expect(status()).toBe(region);
    expect(region?.textContent).toContain('fast-diff');
  });

  it('answers out of order: an older text’s answer never replaces the newer one', async () => {
    let answerOld: (value: unknown) => void = () => {};
    resolveApplyPackage
      .mockImplementationOnce(() => new Promise((resolve) => (answerOld = resolve)))
      .mockResolvedValueOnce(FOUND);
    await draw();
    await nominate('left-padder');
    await act(async () => vi.advanceTimersByTime(400));
    const input = container.querySelector('input') as HTMLInputElement;
    await typeInto(input, 'fast-diff');
    await act(async () => vi.advanceTimersByTime(400));
    await settle();
    expect(words()).toContain('2. Tell us about fast-diff');
    // The first text's answer comes last, and is dropped.
    await act(async () => answerOld(NOT_FOUND));
    expect(words()).not.toContain('We could not find it');
    expect(words()).toContain('2. Tell us about fast-diff');
    expect(resolveApplyPackage.mock.calls).toEqual([['left-padder'], ['fast-diff']]);
  });
});

describe('choosing a package of their own', () => {
  it('sends its registry and name; a refusal says why and keeps the form', async () => {
    sendApplication.mockResolvedValue({ ok: false, refusal: 'PACKAGE_TAKEN', application: null });
    await draw();
    await click(container.querySelector('button[role="radio"][value="PYPI/tidy-env"]') as Element);
    expect(words()).toContain('it checks tidy-env against the rules');
    await click(button('Show the prompt'));
    expect(words()).toContain('Check whether the PyPI package tidy-env (github.com/octocat/tidy-env)');
    await click(button('Send application'));
    await settle();
    expect(sendApplication).toHaveBeenCalledWith({ registry: 'PYPI', name: 'tidy-env' });
    expect(words()).toContain('Someone has already applied for this package. We will look at it.');
    expect(words()).toContain('2. Tell us about tidy-env');
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(false);
  });
});

describe('an application in review', () => {
  it('notes it for the avatar menu; Cancel confirms, removes it, forgets the note and shows the form again', async () => {
    cancelApplication.mockResolvedValue({ ok: true, refusal: null, application: null });
    await draw(viewOf({ application: applicationOf() }));
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(true);
    await click(button('Cancel application'));
    expect(words()).toContain(
      'Cancel your application? This removes your application for tiny-clamp completely, with your note.',
    );
    await click(button('Remove application'));
    await settle();
    expect(cancelApplication).toHaveBeenCalledTimes(1);
    expect(words()).toContain('1. Choose a package');
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(false);
  });

  it('a cancel refused keeps the application and says why', async () => {
    cancelApplication.mockResolvedValue({ ok: false, refusal: 'NOT_CANCELLABLE', application: null });
    await draw(viewOf({ application: applicationOf() }));
    await click(button('Cancel application'));
    await click(button('Remove application'));
    await settle();
    expect(words()).toContain('It can’t be cancelled any more. Reload the page to see where it stands.');
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(true);
  });
});

describe('a closed application', () => {
  it('not picked: forgets an old note, and Send a new application opens the form', async () => {
    rememberHeroApplication('octocat');
    await draw(viewOf({ application: applicationOf({ status: 'NOT_PICKED' }) }));
    expect(hasHeroApplication(document.cookie, 'octocat')).toBe(false);
    await click(button('Send a new application'));
    expect(words()).toContain('1. Choose a package');
  });
});
