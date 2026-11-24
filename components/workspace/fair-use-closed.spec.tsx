// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({
  appealFairUse: vi.fn(),
  answerFairUseNotice: vi.fn(),
  dismissFairUseNotice: vi.fn(),
  dismissRulesBanner: vi.fn(),
}));
vi.mock('@/lib/workspace/fair-use.actions', () => actions);

const { FairUseBanners } = await import('./fair-use-banners');
const { ContributeNotices } = await import('./contribute-notices');
const { FairUseAppealLive, sendFairUseAppeal } = await import('./fair-use-appeal-live');
const { FairUseAnswerScreen } = await import('@/app/(workspace)/contribute/components/fair-use-answer');
const { accessNoticesOf } = await import('@/lib/workspace/contribute-state');
const { accessClosed, accessClosedNotice, claimRatioWarning, fairUse, outsideFixNotice } = await import(
  '@/lib/contribute/__fixtures__/fair-use'
);

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
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
const type = (value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });
const submit = () =>
  act(async () => container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true })));
const plain = () => container.textContent?.replace(/\s+/g, ' ') ?? '';

describe('the messages of the rules of today', () => {
  it('show an email step and a warning as messages with their answer page', async () => {
    await render(<FairUseBanners fairUse={fairUse({ notices: [outsideFixNotice, claimRatioWarning] })} />);
    expect(plain()).toContain('A pull request you opened outside GitRanks fixes an issue you took on GitRanks.');
    expect(plain()).toContain('You can now see 5 full issues a day, until pull requests catch up.');
    const answers = [...container.querySelectorAll('a')].filter((link) => link.textContent === 'Answer');
    expect(answers.map((link) => link.getAttribute('href'))).toEqual([
      '/contribute/answer/583231-outsideFix-1-1',
      '/contribute/answer/583231-claimRatio-2-1',
    ]);
  });

  it('show a closed access with "Ask us to look again" in place of "Answer", and no close button', async () => {
    await render(<FairUseBanners fairUse={fairUse({ notices: [accessClosedNotice], block: accessClosedNotice })} />);
    expect(container.querySelector('[data-fair-use="block"]')?.textContent).toContain(
      'Your access to real issues on GitRanks is closed.',
    );
    const ask = [...container.querySelectorAll('a')].find((link) => link.textContent === 'Ask us to look again');
    expect(ask?.getAttribute('href')).toBe('/contribute/answer/583231-claimRatio-3-1');
    expect(container.querySelector('button[aria-label="Close"]')).toBeNull();
    expect(plain()).not.toContain('Answer');
  });

  it('name the closed access in the list notice, with its way to ask again', () => {
    const html = renderToStaticMarkup(<ContributeNotices notices={accessNoticesOf(accessClosed)} />);
    expect(html).toContain('Your access to real issues is closed');
    expect(html).toContain('href="/contribute/answer/583231-claimRatio-3-1"');
    expect(html).toContain('Ask us to look again →');
    expect(html).not.toContain('Contribute is paused');
  });
});

describe('the answer page of a closed access', () => {
  it('shows the closing words and the request form, not an answer to the message', async () => {
    await render(<FairUseAnswerScreen notice={accessClosedNotice} byEmail />);
    expect(container.querySelector('[data-answer-page="appeal"]')).not.toBeNull();
    expect(container.querySelector('[data-answer-form]')).toBeNull();
    expect(container.querySelector('[data-appeal-form]')).not.toBeNull();
    expect(plain()).toContain('Your access to real issues on GitRanks is closed.');
    expect(plain()).toContain('also by email');
    expect(plain()).toContain('You can also write to us at hello@gitranks.com.');
  });

  it('answers the other messages of the rules of today as before', async () => {
    await render(<FairUseAnswerScreen notice={outsideFixNotice} />);
    expect(container.querySelector('[data-answer-form]')).not.toBeNull();
    expect(container.querySelector('[data-appeal-form]')).toBeNull();
  });
});

describe('the request to look again, wired', () => {
  it('sends the words and turns into the request in place', async () => {
    actions.appealFairUse.mockResolvedValue({ ok: true, data: { at: '2026-11-24T10:00:00.000Z', answeredAt: null } });
    await render(<FairUseAppealLive />);
    await type('It was my own repository.');
    await submit();
    expect(actions.appealFairUse).toHaveBeenCalledWith('It was my own repository.');
    expect(container.querySelector('[data-appeal-sent]')).not.toBeNull();
    expect(plain()).toContain('You asked us to look again on');
  });

  it('points to email while the API does not take requests yet', async () => {
    actions.appealFairUse.mockResolvedValue({ ok: false, error: 'NOT_AVAILABLE_YET' });
    await render(<FairUseAppealLive />);
    await type('Please look again.');
    await submit();
    expect(container.querySelector('[data-appeal-form]')).not.toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Your request could not be sent from here. Write to us at hello@gitranks.com.',
    );
    expect(plain()).toContain('You can also write to us at hello@gitranks.com.');
  });

  it("gives the form the refusal's code, a thrown send as failed, and the request for a saved one", async () => {
    actions.appealFairUse.mockResolvedValueOnce({ ok: false, error: 'INVALID', message: 'Not closed.' });
    expect(await sendFairUseAppeal('x')).toEqual({ ok: false, error: 'INVALID', message: 'Not closed.' });
    actions.appealFairUse.mockResolvedValueOnce({ ok: false, error: 'NOT_AVAILABLE_YET' });
    expect(await sendFairUseAppeal('x')).toEqual({ ok: false, error: 'NOT_AVAILABLE_YET' });
    actions.appealFairUse.mockRejectedValueOnce(new Error('down'));
    expect(await sendFairUseAppeal('x')).toEqual({ ok: false, error: 'FAILED' });
    const appeal = { at: '2026-11-24T10:00:00.000Z', answeredAt: null };
    actions.appealFairUse.mockResolvedValueOnce({ ok: true, data: appeal });
    expect(await sendFairUseAppeal('x')).toEqual({ ok: true, data: appeal });
  });
});
