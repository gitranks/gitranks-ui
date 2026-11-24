// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChecksLine } from './checks-line';
import { RoundsList, type RoundsListProps } from './rounds-list';
import {
  PR_NOW,
  prChecks,
  prContribute,
  prLinks,
  prPage,
  prReview,
  prRound,
  prRoundReady,
} from '@/lib/workspace/__fixtures__/pull-request';
import type { PullRequestRound } from '@/lib/workspace/pull-request-page.types';

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
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) => each.textContent?.trim() === label) ??
  container.querySelector<HTMLElement>(`[aria-label="${label}"]`);
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const type = (field: HTMLTextAreaElement | null, value: string) =>
  act(async () => {
    if (!field) throw new Error('No field');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    setter?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
const rounds = (props: Partial<RoundsListProps> & Pick<RoundsListProps, 'page'>) =>
  render(<RoundsList now={PR_NOW} links={prLinks} {...props} />);
const round = (n: number) => container.querySelector<HTMLElement>(`[data-round="${n}"]`);

describe('a round that waits', () => {
  it('is drawn open, newest first: what was asked, the checks, and its two actions', async () => {
    await rounds({ page: prReview.asked, onMarkNotNeeded: vi.fn() });
    expect([...container.querySelectorAll('[data-round]')].map((each) => each.getAttribute('data-round'))).toEqual([
      '2',
      '1',
    ]);
    const open = round(2);
    expect(open?.getAttribute('data-round-state')).toBe('WAITING');
    expect(open?.textContent).toContain('A review asking for changes, 1 comment, 5 from CodeRabbit, 1 failing check');
    expect(open?.textContent).toContain('To answer');
    // A review that asks for changes is one block; a person's words are three lines at most, with GitHub.
    const review = open?.querySelector('[data-ask="changes_requested"]');
    expect(review?.textContent).toContain('mara-k');
    expect(review?.textContent).toContain('Asked for changes');
    expect(review?.textContent).toContain('a review with 7 comments');
    expect(review?.querySelector('blockquote')?.className).toContain('line-clamp-3');
    expect(open?.querySelector('[data-ask="conversation"]')?.textContent).toContain('in the conversation');
    // A bot is folded to one row.
    expect(open?.textContent).toContain('CodeRabbitbot5 comments');
    // The failing check is in the checks line, not named twice.
    expect(open?.querySelector('[data-checks]')).not.toBeNull();
    expect(open?.textContent).not.toContain('The check unit-test fails.');
    expect(button('Copy the prompt')).not.toBeNull();
    expect(button('Mark as not needed')).not.toBeNull();
    // Round 1 is one row.
    expect(round(1)?.textContent).toContain('The pull request opened with 4 files.');
    expect(round(1)?.textContent).toContain('1 commit and 2 replies, sent on 21 Oct.');
    expect(round(1)?.textContent).toContain('Done');
  });

  it('starts a hosted round with a button in place of the prompt, never in Learn', async () => {
    const onStartRound = vi.fn();
    await rounds({ page: prContribute.asked, onStartRound });
    expect(button('Copy the prompt')).toBeNull();
    await press(button('Start round 2'));
    expect(onStartRound).toHaveBeenCalledWith(2);
    await rounds({ page: prPage({ ...prReview.asked, hosted: true }), onStartRound });
    expect(button('Start round 2')).toBeNull();
    expect(button('Copy the prompt')).not.toBeNull();
  });

  it('asks why it is not needed in the buttons’ place, and keeps the reason', async () => {
    const onMarkNotNeeded = vi.fn();
    await rounds({ page: prReview.asked, onMarkNotNeeded });
    await press(button('Mark as not needed'));
    expect(document.activeElement?.textContent).toBe('Why is round 2 not needed?');
    expect(button('Copy the prompt')).toBeNull();
    await press(button('Keep the round'));
    expect(button('Mark as not needed')).not.toBeNull();
    await press(button('Mark as not needed'));
    await press(button('The checks fail on the main branch too'));
    expect(onMarkNotNeeded).toHaveBeenCalledWith(2, 'FAILS_ON_BASE');
    // The focus goes back to the round's row, and stays there once the round is drawn as not needed.
    expect(document.activeElement).toBe(round(2));
    const marked = prRound({ state: 'NOT_NEEDED', notNeeded: 'FAILS_ON_BASE', prompt: null });
    await rounds({ page: prPage({ ...prReview.asked, rounds: [marked, ...prReview.asked.rounds.slice(1)] }) });
    expect(round(2)?.getAttribute('data-round-state')).toBe('NOT_NEEDED');
    expect(document.activeElement).toBe(round(2));
  });

  it('opens a round opened again, as the data says, and keeps a round the person closed closed', async () => {
    await rounds({ page: prReview.notNeeded, onReopen: vi.fn() });
    expect(round(3)?.querySelector('h3')).toBeNull();
    const reopened = prPage({
      ...prReview.notNeeded,
      rounds: prReview.notNeeded.rounds.map(
        (each): PullRequestRound => (each.n === 3 ? { ...each, state: 'WAITING', notNeeded: null } : each),
      ),
    });
    await rounds({ page: reopened, onReopen: vi.fn() });
    expect(round(3)?.querySelector('h3')?.textContent).toBe('Round 3');

    await press(button('Close round 3'));
    expect(round(3)?.textContent).toContain('Not answered yet.');
    await rounds({ page: prPage({ ...reopened, checks: null }) });
    expect(round(3)?.querySelector('h3')).toBeNull();
  });

  it('says where a closed open round stands, never "Sent ."', async () => {
    const page = (state: PullRequestRound['state']) =>
      prPage({ ...prReview.ready, rounds: [prRound({ ...prRoundReady, state, sentAt: null })] });
    const closed = async (state: PullRequestRound['state']) => {
      // A fresh list each time: a round the person closed stays closed in the same list.
      await render(null);
      await rounds({ page: page(state) });
      await press(button('Close round 2'));
      return round(2)?.textContent ?? '';
    };
    expect(await closed('WORKING')).toContain('Your agent is working on it.');
    expect(await closed('READY')).toContain('Ready to send: 2 commits and 8 replies.');
    await rounds({ page: page('SENT') });
    expect(round(2)?.textContent).toContain('2 commits and 8 replies, sent.');
    expect(round(2)?.textContent).not.toContain('sent .');
  });

  it('closes to one row and opens again', async () => {
    await rounds({ page: prReview.asked });
    await press(button('Close round 2'));
    expect(round(2)?.querySelector('h3')).toBeNull();
    await press(button('Open round 2'));
    expect(round(2)?.querySelector('h3')?.textContent).toBe('Round 2');
  });
});

describe('a round that is ready', () => {
  it('folds what was asked, says what the agent did, and sends the round as a whole', async () => {
    const onSendRound = vi.fn();
    const onSendBack = vi.fn();
    await rounds({ page: prReview.ready, onSendRound, onSendBack });
    const open = round(2);
    expect(open?.textContent).toContain('Ready for you');
    expect(open?.textContent).toContain('2 commits and 8 replies');
    expect(open?.textContent).toContain('The cap now sits where retries are counted');
    expect(button('Read the change')?.getAttribute('href')).toBe(prLinks.change);
    // Seven replies to one review fold into one row that opens.
    expect(button('Replies to mara-k’s review7 replies')).not.toBeNull();
    await press(button('Send round 2: 2 commits and 8 replies'));
    expect(onSendRound).toHaveBeenCalledWith(2);
    await press(button('Send it back to your agent'));
    expect(onSendBack).toHaveBeenCalledWith(2);
  });

  it('edits a reply in place, leaves one out and puts it back', async () => {
    const onReplyText = vi.fn();
    const onReplyLeftOut = vi.fn();
    await rounds({ page: prReview.ready, onReplyText, onReplyLeftOut });
    const left = container.querySelector('[data-reply="r_9"]');
    expect(left?.getAttribute('data-reply-state')).toBe('left-out');
    expect(left?.textContent).toContain('will not be sent');
    await press(button('Put back the reply to sam-lee'));
    expect(onReplyLeftOut).toHaveBeenCalledWith(2, 'r_9', false);
    await press(button('Do not send the reply to dev-okoro'));
    expect(onReplyLeftOut).toHaveBeenCalledWith(2, 'r_8', true);

    await press(button('Edit the reply to dev-okoro'));
    const field = container.querySelector<HTMLTextAreaElement>('[data-reply="r_8"] textarea');
    expect(document.activeElement).toBe(field);
    await type(field, 'Reworded: the line names the limit.');
    await press(button('Save the reply'));
    expect(onReplyText).toHaveBeenCalledWith(2, 'r_8', 'Reworded: the line names the limit.');
    expect(container.querySelector('[data-reply="r_8"] textarea')).toBeNull();
    // The focus is back on the reply's own edit button, after saving and after cancelling.
    expect(document.activeElement).toBe(button('Edit the reply to dev-okoro'));
    await press(button('Edit the reply to dev-okoro'));
    await press(button('Cancel'));
    expect(document.activeElement).toBe(button('Edit the reply to dev-okoro'));
  });

  it('gives the focus back to the reply after leaving it out or putting it back', async () => {
    const onReplyLeftOut = vi.fn();
    const withReply = (leftOut: boolean) =>
      prPage({
        ...prReview.ready,
        rounds: [
          {
            ...prRoundReady,
            replies: prRoundReady.replies.map((reply) => (reply.id === 'r_8' ? { ...reply, leftOut } : reply)),
          },
          ...prReview.ready.rounds.slice(1),
        ],
      });
    await rounds({ page: withReply(false), onReplyLeftOut });
    await press(button('Do not send the reply to dev-okoro'));
    await rounds({ page: withReply(true), onReplyLeftOut });
    expect(document.activeElement).toBe(button('Put back the reply to dev-okoro'));
    await press(button('Put back the reply to dev-okoro'));
    await rounds({ page: withReply(false), onReplyLeftOut });
    expect(document.activeElement).toBe(button('Do not send the reply to dev-okoro'));
  });

  it('cannot edit the replies of a round that was sent', async () => {
    await rounds({ page: prReview.sent, initialOpen: [2], onReplyText: vi.fn(), onReplyLeftOut: vi.fn() });
    expect(round(2)?.textContent).toContain('2 commits and 8 replies, sent today.');
    expect(round(2)?.textContent).toContain('With the maintainers');
    expect(container.querySelector('[aria-label^="Edit the reply"]')).toBeNull();
  });
});

describe('a sent round', () => {
  it('is one row, waiting for the maintainers', async () => {
    await rounds({ page: prReview.sent });
    expect(round(2)?.querySelector('h3')).toBeNull();
    expect(round(2)?.textContent).toContain(
      'A review asking for changes, 1 comment, 5 from CodeRabbit, 1 failing check.',
    );
    expect(round(2)?.textContent).toContain('With the maintainers');
  });

  it('stays open to show what came after and asks for nothing, with the way to say it does', async () => {
    const onAsks = vi.fn();
    await rounds({ page: prReview.asksNothing, onAsks });
    const since = round(2);
    expect(since?.textContent).toContain('Since it was sent');
    expect(since?.textContent).toContain('No answer needed');
    expect(since?.textContent).toContain('Thank you! I will review this later this week.');
    await press(button('It does need an answer'));
    expect(onAsks).toHaveBeenCalledWith('c_9');
  });
});

describe('a round marked as not needed', () => {
  it('says why and opens again', async () => {
    const onReopen = vi.fn();
    await rounds({ page: prReview.notNeeded, onReopen });
    const row = round(3);
    expect(row?.textContent).toContain('2 from CodeRabbit, 2 failing checks.');
    expect(row?.textContent).toContain('You marked it as not needed: the checks fail on the main branch too.');
    expect(row?.textContent).toContain('Not needed');
    await press(button('Open it again'));
    expect(onReopen).toHaveBeenCalledWith(3);
  });
});

describe('the checks line', () => {
  it('counts by who can act, and opens a row for each check that does not pass', async () => {
    await render(<ChecksLine checks={prChecks} />);
    expect([...container.querySelectorAll('[data-check-chip]')].map((chip) => chip.textContent)).toEqual([
      '11 pass',
      '1 your agent can fix',
      '1 needs you',
      '3 not yours to fix',
    ]);
    const list = container.querySelector<HTMLElement>('ul');
    expect(list?.hidden).toBe(true);
    await press(button('Show the 5 that do not pass'));
    expect(list?.hidden).toBe(false);
    const rows = [...container.querySelectorAll('[data-check-row]')].map((row) => row.textContent);
    expect(rows[0]).toContain('unit-testYour agent can fixA test your change touches fails.');
    expect(rows[2]).toContain('e2e-nightlyNot yours to fixIt already fails on the main branch.');
    expect(button('Hide the 5 that do not pass')).not.toBeNull();
  });

  it('lists nothing when every check passes', async () => {
    await render(<ChecksLine checks={{ pass: 14, agentCanFix: 0, needsYou: 0, notYours: 0, rows: [] }} />);
    expect(container.textContent).toBe('14 pass');
  });
});
