// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ answerFairUseNotice: vi.fn() }));
vi.mock('@/lib/workspace/fair-use.actions', () => actions);

const { FairUseAnswerScreen } = await import('./fair-use-answer');
const { answeredNotice, blockNotice, fairUseNotice, warningNotice } = await import(
  '@/lib/contribute/__fixtures__/fair-use'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// The radios measure themselves; jsdom has no ResizeObserver.
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
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === label) ?? null;
const radio = (label: string) =>
  [...container.querySelectorAll('label')]
    .find((each) => each.textContent?.trim() === label)
    ?.querySelector<HTMLButtonElement>('[role="radio"]') ?? null;
const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
/** Types into the text box the way React hears it. */
const type = (value: string) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });
const send = () => act(async () => button('Send answer')?.closest('form')?.requestSubmit());

describe('the answer page', () => {
  it('shows the message as sent, its pull request linked, and its choices with an optional comment', async () => {
    await render(<FairUseAnswerScreen notice={fairUseNotice()} byEmail />);
    expect(container.querySelector('h1')?.textContent).toBe('A message from GitRanks');
    expect(container.textContent).toContain('Sent Oct 27 · also by email');
    expect(container.querySelector('a[href="https://github.com/acme/widgets/pull/412"]')?.textContent).toBe(
      'acme/widgets#412',
    );
    expect([...container.querySelectorAll('[role="radio"]')]).toHaveLength(4);
    expect([...container.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
      'Approval took too long',
      'My agent did it on its own',
      'I wanted to edit the pull request first',
      'Something else',
      'Anything to addoptional',
    ]);
    expect(textarea().maxLength).toBe(2000);
    expect(container.textContent).toContain('Only the GitRanks team reads it.');
    expect(container.querySelector('a[href="/terms#contribute-rules"]')?.textContent).toBe('Terms of service');
    // Nothing picked or written: nothing to send.
    expect(button('Send answer')?.disabled).toBe(true);
  });

  it('sends the choice and the words, then shows the answer in the form’s place; a second answer replaces it', async () => {
    const answered = fairUseNotice({
      answer: { choice: 'approval_slow', text: 'It did not load.', at: '2026-10-27T10:00:00.000Z' },
    });
    actions.answerFairUseNotice.mockResolvedValueOnce({ ok: true, data: answered });
    await render(<FairUseAnswerScreen notice={fairUseNotice()} />);
    expect(container.textContent).not.toContain('also by email');
    await act(async () => radio('Approval took too long')?.click());
    await type('  It did not load.  ');
    await send();
    expect(actions.answerFairUseNotice).toHaveBeenCalledWith({
      noticeId: '583231-outsidePr-1-1',
      choice: 'approval_slow',
      text: '  It did not load.  ',
    });
    expect(container.querySelector('[data-answer-form]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      'Sent. Thank you.Your answer reached the GitRanks team. We read every answer.',
    );
    expect(container.querySelector('[data-answer-sent]')?.textContent).toContain(
      'Your answerApproval took too longIt did not load.',
    );
    // The message stays.
    expect(container.textContent).toContain('Why did you use another way?');

    await act(async () => button('Change my answer')?.click());
    expect(textarea().value).toBe('It did not load.');
    expect(radio('Approval took too long')?.getAttribute('aria-checked')).toBe('true');
  });

  it('opens on the answer already sent, with a way back to Contribute', async () => {
    await render(<FairUseAnswerScreen notice={answeredNotice} />);
    expect(container.querySelector('[data-answer-form]')).toBeNull();
    expect(container.querySelector('[data-answer-sent]')?.textContent).toContain('Approval took too long');
    expect(container.querySelector('a[href="/contribute"]')?.textContent).toBe('Back to Contribute');
  });

  it('asks the warning and the block for words alone, and needs them', async () => {
    await render(<FairUseAnswerScreen notice={warningNotice} />);
    expect(container.querySelector('[role="radio"]')).toBeNull();
    expect(container.querySelector('label')?.textContent).toBe('Tell us what is in your way');
    // "tell us here" is the page itself: plain words here.
    expect(container.querySelector('a[href^="/contribute/answer/"]')).toBeNull();
    expect(button('Send answer')?.disabled).toBe(true);
    await type('   ');
    expect(button('Send answer')?.disabled).toBe(true);
    await type('The approvals are slow.');
    expect(button('Send answer')?.disabled).toBe(false);

    await render(<FairUseAnswerScreen key="block" notice={blockNotice} />);
    expect(container.querySelector('label')?.textContent).toBe('If this is a mistake, tell us why');
  });

  it('says why an answer was not sent and keeps what was written', async () => {
    actions.answerFairUseNotice.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await render(<FairUseAnswerScreen notice={warningNotice} />);
    await type('The approvals are slow.');
    await send();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Your answer was not sent. Try again in a minute.',
    );
    expect(textarea().value).toBe('The approvals are slow.');

    actions.answerFairUseNotice.mockResolvedValueOnce({ ok: false, error: 'INVALID', message: 'Not a choice we gave' });
    await send();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Not a choice we gave');
  });
});
