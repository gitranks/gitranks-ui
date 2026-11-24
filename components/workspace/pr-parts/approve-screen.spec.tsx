// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApproveScreen, type ApproveScreenProps } from './approve-screen';
import { prApprovals, prLinks, prPatch } from '@/lib/workspace/__fixtures__/pull-request';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

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
const text = () => container.textContent ?? '';
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) =>
    each.textContent?.trim().startsWith(label),
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const key = (init: KeyboardEventInit) =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init }));
  });
const type = (field: HTMLInputElement | HTMLTextAreaElement | null, value: string) =>
  act(async () => {
    if (!field) throw new Error('No field');
    const proto = field instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
const note = () => container.querySelector('[data-note]');
const screen = (props: Partial<ApproveScreenProps> = {}) =>
  render(
    <ApproveScreen
      made="LEARN"
      repo="harbor-kit/relay"
      issueNumber={431}
      issueTitle="The retry list grows without limit when a webhook keeps failing"
      approval={prApprovals.send}
      patch={prPatch}
      links={{ back: prLinks.approve, answers: prLinks.answers, lesson: prLinks.lesson }}
      {...props}
    />,
  );

describe('Approve, right after the walkthrough', () => {
  it('shows what is sent on the left and one card on the right', async () => {
    await screen();
    expect(button('← Your pull request')).not.toBeNull();
    expect(text()).toContain('You finished the walkthrough.');
    expect(button('See your answers')?.getAttribute('href')).toBe(prLinks.answers);
    expect(container.querySelector<HTMLInputElement>('input')?.value).toBe(
      'Cap the retry list when a webhook keeps failing',
    );
    expect(container.querySelector('[data-footer]')?.textContent).toContain('Added under your text');
    expect(text()).toContain('4 files86 lines added12 removed');
    // The change, file by file, in the site's own viewer.
    expect(text()).toContain('delivery/retry.go');
    expect(text()).toContain('delivery/retry_test.go');
    expect(container.querySelector('[data-approve-card] h2')?.textContent).toBe(
      'Send this pull request to harbor-kit/relay',
    );
    expect(note()?.textContent).toContain('GitRanks shows on a public page how it was made.');
    expect(container.querySelector('[data-approve-card] [role="checkbox"]')).toBeNull();
    expect(container.querySelector('[data-lesson-later]')?.textContent).toBe(
      'After it is sent: questions on A stack: last in, first out, if you want them.',
    );
  });

  it('sends on the button, or on Ctrl + Enter; Enter alone does nothing', async () => {
    const onSend = vi.fn();
    await screen({ onSend });
    await key({});
    expect(onSend).not.toHaveBeenCalled();
    await key({ ctrlKey: true });
    expect(onSend).toHaveBeenCalledWith({
      title: 'Cap the retry list when a webhook keeps failing',
      description: prApprovals.send.description,
      signOff: false,
    });
    await key({ metaKey: true });
    expect(onSend).toHaveBeenCalledTimes(2);
    await press(button('Send the pull request'));
    expect(onSend).toHaveBeenCalledTimes(3);
  });

  it('previews the description as GitHub shows it, never as HTML', async () => {
    await screen({
      approval: {
        ...prApprovals.send,
        description: 'Some `code` here.\n\n<script>alert(1)</script>\n\n![x](https://x.y/a.png)',
      },
    });
    await press(button('Preview'));
    const preview = container.querySelector('[data-preview]');
    expect(preview?.textContent).toContain('Fixes #431');
    expect(preview?.querySelector('code')?.textContent).toBe('code');
    expect(preview?.querySelector('script, img')).toBeNull();
    expect(button('Preview')?.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('something is needed first', () => {
  it('shows each need where it is fixed, names both in the card, and the button waits', async () => {
    const onSend = vi.fn();
    await screen({ approval: prApprovals.needs, onSend });
    expect(container.querySelector('[data-prefix]')?.textContent).toContain(
      'This project wants a title to start with fix:',
    );
    expect(note()?.textContent).toBe('Needed before sending: a title that starts with “fix:”, and the sign-off.');
    expect((button('Send the pull request') as HTMLButtonElement).disabled).toBe(true);
    await key({ ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();

    await press(button('Add “fix:”'));
    expect(container.querySelector<HTMLInputElement>('input')?.value).toBe(
      'fix: Cap the retry list when a webhook keeps failing',
    );
    expect(container.querySelector('[data-prefix]')).toBeNull();
    expect(note()?.textContent).toBe('Needed before sending: the sign-off.');
    await press(container.querySelector<HTMLElement>('[role="checkbox"]'));
    await key({ ctrlKey: true });
    expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ signOff: true }));
  });

  it('asks for a title when it is emptied', async () => {
    await screen();
    await type(container.querySelector('input'), ' ');
    expect(note()?.textContent).toBe('Needed before sending: a title.');
  });
});

describe("the card's other states", () => {
  it('goes to GitHub for its permission, and tries again after a failure', async () => {
    await screen({ approval: prApprovals.github });
    expect(note()?.textContent).toContain('GitHub asks you once for permission');
    expect(button('Allow on GitHub and send')).not.toBeNull();
    await screen({ state: 'failed' });
    expect(note()?.textContent).toBe('GitHub could not be reached. Nothing was sent, and your text is kept.');
    expect(button('Send it again')).not.toBeNull();
  });

  it('has the tick on when the settings already give the sign-off', async () => {
    await screen({ approval: prApprovals.signedOff });
    expect(container.querySelector('[role="checkbox"]')?.getAttribute('aria-checked')).toBe('true');
    expect(note()?.getAttribute('data-note')).toBe('plain');
  });

  it("sends it back to the agent from a field in the note's place, and the cross closes it", async () => {
    const onSendBack = vi.fn();
    const onSend = vi.fn();
    await screen({ onSendBack, onSend });
    await press(button('Send it back to your agent'));
    const field = container.querySelector<HTMLTextAreaElement>('[data-send-back] textarea');
    expect(document.activeElement).toBe(field);
    expect(note()).toBeNull();
    expect((button('Send it back') as HTMLButtonElement).disabled).toBe(true);
    await type(field, 'Keep the default as it was.');
    await key({ ctrlKey: true });
    expect(onSendBack).toHaveBeenCalledWith('Keep the default as it was.');
    expect(onSend).not.toHaveBeenCalled();
    await press(container.querySelector('[aria-label="Close without sending it back"]'));
    expect(container.querySelector('[data-send-back]')).toBeNull();
    expect(document.activeElement?.textContent).toBe('Send it back to your agent');
  });
});

describe('Approve in Contribute', () => {
  it('has no line about answers and no lesson after', async () => {
    await screen({ made: 'CONTRIBUTE', approval: prApprovals.contribute });
    expect(text()).not.toContain('walkthrough');
    expect(container.querySelector('[data-lesson-later]')).toBeNull();
    expect(text()).toContain('2 files31 lines added4 removed');
  });
});
