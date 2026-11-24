// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FairUseAppealForm } from './fair-use-appeal';
import { openAppeal } from '@/lib/workspace/__fixtures__/masked-issue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  vi.useRealTimers();
  act(() => root.unmount());
  container.remove();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const textarea = () => container.querySelector('textarea') as HTMLTextAreaElement;
const submit = () => container.querySelector<HTMLButtonElement>('button[type="submit"]');
const type = (value: string) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(textarea(), value);
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
  });
const send = () => act(async () => submit()?.closest('form')?.requestSubmit());
const FAILED = { ok: false as const, error: 'FAILED' as const };

describe('asking to look again', () => {
  it('shows the closing words and a form with one text box of up to 2,000 characters', async () => {
    await render(<FairUseAppealForm appeal={null} />);
    expect(container.querySelector('[data-ban]')?.textContent).toBe(
      'Your access to real issues on GitRanks is closed. If you think this is wrong, ask us to look again.',
    );
    expect(container.querySelector('h2')?.textContent).toBe('Ask us to look again');
    expect(container.querySelectorAll('textarea')).toHaveLength(1);
    expect(textarea().maxLength).toBe(2000);
    expect(submit()?.disabled).toBe(true);
    expect(container.querySelector('a[href="/terms#contribute-rules"]')).not.toBeNull();
  });

  it('shows no form that cannot send: the closing words and the Terms link alone', async () => {
    await render(<FairUseAppealForm appeal={null} formNeedsSend />);
    expect(container.querySelector('[data-fair-use-appeal]')?.getAttribute('data-fair-use-appeal')).toBe('closed');
    expect(container.querySelector('[data-ban]')).not.toBeNull();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('a[href="/terms#contribute-rules"]')).not.toBeNull();
    await render(<FairUseAppealForm appeal={null} formNeedsSend onSend={async () => FAILED} />);
    expect(container.querySelector('form')).not.toBeNull();
  });

  it("sends the request and shows its date in the form's place", async () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-28T12:00:30.000Z'), toFake: ['Date'] });
    const onSend = vi.fn(async () => ({
      ok: true as const,
      data: { at: '2026-10-28T12:00:00.000Z', answeredAt: null },
    }));
    await render(<FairUseAppealForm appeal={null} onSend={onSend} />);
    await type('  The pull request was opened before I took the issue.  ');
    expect(submit()?.disabled).toBe(false);
    await send();
    expect(onSend).toHaveBeenCalledWith('The pull request was opened before I took the issue.');
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('[data-appeal-sent]')?.textContent).toContain(
      'You asked us to look again on Oct 28.',
    );
    expect(container.querySelector('[data-appeal-already]')).toBeNull();
  });

  it('says a request saved before the send is the one already open, and how to add to it', async () => {
    vi.useFakeTimers({ now: Date.parse('2026-10-28T12:00:00.000Z'), toFake: ['Date'] });
    await render(
      <FairUseAppealForm
        appeal={null}
        onSend={async () => ({ ok: true, data: { at: '2026-10-27T09:00:00.000Z', answeredAt: null } })}
      />,
    );
    await type('Please look again.');
    await send();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('[data-appeal-already]')?.textContent).toBe(
      'We already have your request of Oct 27. To add to it, write to hello@gitranks.com.',
    );
    expect(container.querySelector('[data-appeal-already] a')?.getAttribute('href')).toBe('mailto:hello@gitranks.com');
  });

  it.each([
    ['fails', async () => FAILED],
    ['throws', async () => Promise.reject(new Error('offline'))],
  ])('says to try again when the send %s, and keeps the text', async (_, onSend) => {
    await render(<FairUseAppealForm appeal={null} onSend={onSend} />);
    await type('Please look again.');
    await send();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Your request was not sent. Try again in a minute.',
    );
    expect(textarea().value).toBe('Please look again.');
  });

  it.each([
    ['refuses it', { ok: false as const, error: 'INVALID' as const, message: 'Your access is not closed.' }],
    ['does not take requests yet', { ok: false as const, error: 'NOT_AVAILABLE_YET' as const }],
  ])('points to email when the API %s', async (_, answer) => {
    await render(<FairUseAppealForm appeal={null} onSend={async () => answer} />);
    await type('Please look again.');
    await send();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Your request could not be sent from here. Write to us at hello@gitranks.com.',
    );
    expect(textarea().value).toBe('Please look again.');
  });

  it('shows no form while a request is open: one at a time', async () => {
    await render(<FairUseAppealForm appeal={openAppeal} />);
    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).toContain('You asked us to look again on Oct 27.');
  });

  it('lets the person ask again once a request was answered', async () => {
    await render(<FairUseAppealForm appeal={{ ...openAppeal, answeredAt: '2026-10-28T08:00:00.000Z' }} />);
    expect(container.querySelector('form')).not.toBeNull();
    expect(container.textContent).toContain('We answered your request of Oct 27. You can ask again.');
  });
});
