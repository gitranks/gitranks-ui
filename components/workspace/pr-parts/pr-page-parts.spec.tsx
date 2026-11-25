// @vitest-environment jsdom
import type { Route } from 'next';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PullRequestFootLinks } from './foot-links';
import { PullRequestIssueCard } from './issue-card';
import { PullRequestBox, PullRequestOutcomeLine } from './pr-box';
import { FixLinkLine, PullRequestCards } from './pr-cards';
import { StageStrip } from './stage-strip';
import {
  PR_NOW,
  prCla,
  prContribute,
  prEnds,
  prLinks,
  prOnlyYouPage,
  prPage,
  prReview,
  prRoundOne,
  prRoundReady,
  prStages,
} from '@/lib/workspace/__fixtures__/pull-request';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

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
/** A control's words, without the key it takes, the arrow and the words for a new tab. */
const wordsOf = (element: Element) =>
  (element.textContent ?? '').replace(/Ctrl|⌘|⏎|↗|\(opens in a new tab\)/g, '').trim();
const control = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) => wordsOf(each).startsWith(label)) ?? null;
const labels = () =>
  [...container.querySelectorAll<HTMLElement>('[data-box-actions] a, [data-box-actions] button')].map(wordsOf);
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const enter = (init: KeyboardEventInit = {}) =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...init }));
  });
const box = (page: PullRequestPage, props: Partial<Parameters<typeof PullRequestBox>[0]> = {}) =>
  render(<PullRequestBox page={page} now={PR_NOW} links={prLinks} agent="Claude Code" {...props} />);

describe('the issue card', () => {
  it('shows the project, the issue and the pull request, the title and the lesson the fix used', async () => {
    await render(<PullRequestIssueCard page={prReview.asked} lessonHref={prLinks.lesson} backHref={prLinks.back} />);
    expect(control('← Pull requests')?.getAttribute('href')).toBe('/my/pull-requests');
    expect(text()).toContain('harbor-kit/relay');
    expect(control('Issue #431')?.getAttribute('href')).toBe('https://github.com/harbor-kit/relay/issues/431');
    expect(control('PR #58')?.getAttribute('href')).toBe('https://github.com/harbor-kit/relay/pull/58');
    expect(container.querySelector('h1')?.textContent).toBe(
      'The retry list grows without limit when a webhook keeps failing',
    );
    expect(container.querySelector('[data-lesson]')?.textContent).toBe('This fix used A stack: last in, first out.');
  });

  it('says the lesson is a prediction before the fix, and has no lesson line without one', async () => {
    await render(<PullRequestIssueCard page={prStages.fixing} />);
    expect(container.querySelector('[data-lesson]')?.textContent).toBe(
      'This fix is likely to use A stack: last in, first out.',
    );
    expect(control('PR #')).toBeNull();
    await render(<PullRequestIssueCard page={prStages.noLesson} />);
    expect(container.querySelector('[data-lesson]')).toBeNull();
    expect(text()).not.toMatch(/lesson/i);
  });

  it('says a hosted agent made it', async () => {
    await render(<PullRequestIssueCard page={prContribute.asked} />);
    expect(container.querySelector('[data-hosted]')?.textContent).toBe('Hosted agent');
  });
});

describe('the strip', () => {
  it('marks the current stage, its ring turning while work goes on', async () => {
    await render(<StageStrip page={prStages.fixing} />);
    const current = container.querySelector('[aria-current="step"]');
    expect(current?.getAttribute('data-stage')).toBe('FIX');
    expect(current?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('In progress');
    expect(container.querySelectorAll('li')).toHaveLength(5);
  });

  it('checks the stages done, keeps the current one named on a phone, and has four stages in Contribute', async () => {
    await render(<StageStrip page={prStages.approve} />);
    const states = [...container.querySelectorAll('li')].map((li) => li.getAttribute('data-step-state'));
    expect(states).toEqual(['done', 'done', 'current', 'todo', 'todo']);
    const named = [...container.querySelectorAll('li > span:nth-child(2)')].map(
      (span) => !span.className.includes('max-sm:sr-only'),
    );
    expect(named).toEqual([false, false, true, false, false]);
    await render(<StageStrip page={prContribute.asked} />);
    expect(container.querySelectorAll('li')).toHaveLength(4);
  });

  it('greys the stage an ended pull request stopped at', async () => {
    await render(<StageStrip page={prEnds.closed} />);
    expect(container.querySelector('[aria-current="step"]')?.getAttribute('data-step-state')).toBe('stopped');
  });
});

describe('the box', () => {
  it('needs nothing while the agent works', async () => {
    await box(prStages.fixing);
    expect(container.querySelector('h2')?.textContent).toBe('Claude Code is fixing the issue');
    expect(text()).toContain('Nothing is needed from you.');
    expect(labels()).toEqual([]);
  });

  it('has one main action, filled, with the Enter key that presses it', async () => {
    await box(prStages.walkthrough);
    expect(container.querySelector('h2')?.textContent).toBe('Answer 4 questions about the fix');
    const main = control('Start the walkthrough');
    expect(main?.getAttribute('href')).toBe(prLinks.walkthrough);
    expect(main?.hasAttribute('data-main')).toBe(true);
    expect(main?.textContent).toContain('⏎');
    const clicked = vi.fn((event: Event) => event.preventDefault());
    main?.addEventListener('click', clicked);
    await enter();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('leaves out an action the page gives no link or press for', async () => {
    await box(prStages.open, { links: { ...prLinks, lessonQuestions: null } });
    expect(labels()).toEqual(['Another issue on this lesson', 'Back to your course']);
    await box(prStages.noLessonMerged);
    expect(labels()).toEqual(['Fix a similar issue', 'Back to Issues']);
  });

  it('shows the opening as a bar in five parts, with the veto only while autopilot will send it', async () => {
    await box(prStages.opening);
    expect(container.querySelector('[data-opening] [role="img"]')?.getAttribute('aria-label')).toBe('Step 4 of 5');
    expect(text()).toContain('Step 4 of 5 · sending your change to GitHub');
    expect(text()).not.toContain('minute');
    expect(labels()).toEqual([]);
    const onVeto = vi.fn();
    await box(prStages.opening, { onVeto });
    const veto = control('Don’t send it');
    expect(veto?.hasAttribute('data-main')).toBe(false);
    await enter();
    expect(onVeto).not.toHaveBeenCalled();
    await press(veto);
    expect(onVeto).toHaveBeenCalledOnce();
  });

  it('gives a waiting round the prompt to copy for an own agent', async () => {
    await box(prReview.asked);
    expect(container.querySelector('[data-prompt]')?.textContent).toBe(
      'Do round 2 of https://github.com/harbor-kit/relay/pull/58 with GitRanks',
    );
    expect(control('Copy')).not.toBeNull();
  });

  it('starts a hosted round and sends a ready one, with what the round is', async () => {
    const onStartRound = vi.fn();
    await box(prContribute.asked, { onStartRound });
    await press(control('Start round 2'));
    expect(onStartRound).toHaveBeenCalledWith(2);

    const onSendBack = vi.fn();
    await box(prReview.ready, { onSendRound: vi.fn(), onSendBack });
    expect(labels()).toEqual(['Send round 2: 2 commits and 8 replies', 'Send it back to your agent']);
    await press(control('Send it back to your agent'));
    expect(onSendBack).toHaveBeenCalledOnce();
  });

  it('sends a round on Ctrl + Enter, as Approve does: never on Enter alone, nor while a word is composed', async () => {
    const onSendRound = vi.fn();
    await box(prReview.ready, { onSendRound });
    const send = control('Send round 2');
    expect(send?.querySelector('[data-send-key]')?.textContent).toBe('Ctrl⏎');
    expect(send?.textContent).not.toMatch(/^[^C]*⏎$/);
    await enter();
    expect(onSendRound).not.toHaveBeenCalled();
    await enter({ ctrlKey: true, isComposing: true });
    expect(onSendRound).not.toHaveBeenCalled();
    await enter({ ctrlKey: true });
    expect(onSendRound).toHaveBeenCalledWith(2);
    await enter({ metaKey: true });
    expect(onSendRound).toHaveBeenCalledTimes(2);
    await box(prReview.ready, { onSendRound, pending: true });
    await enter({ ctrlKey: true });
    expect(onSendRound).toHaveBeenCalledTimes(2);
  });

  it('names and presses the same round: the one the box is about, else the newest', async () => {
    const onSendRound = vi.fn();
    await box(prPage({ ...prReview.ready, round: null, rounds: [prRoundOne, prRoundReady] }), { onSendRound });
    await press(control('Send round 2'));
    expect(onSendRound).toHaveBeenCalledWith(2);
  });

  it('never starts a round in Learn: the prompt is for the person’s own agent', async () => {
    const onStartRound = vi.fn();
    await box(prPage({ ...prReview.asked, hosted: true }), { onStartRound });
    expect(control('Start round 2')).toBeNull();
    expect(container.querySelector('[data-prompt]')).not.toBeNull();
  });

  it("offers Learn's ways on while the maintainers read, each only with its address", async () => {
    await box(prReview.sent);
    expect(labels()).toEqual(['Learn the lesson it used', 'Another issue on this lesson', 'Back to your course']);
    expect(control('Back to your course')?.getAttribute('href')).toBe(prLinks.course);
    await box(prReview.sent, { links: { ...prLinks, lessonQuestions: null, course: null } });
    expect(labels()).toEqual(['Another issue on this lesson']);
    await box(prPage({ ...prReview.sent, lesson: null, lessonToAsk: false }));
    expect(labels()).toEqual([]);
    expect(text()).toContain('Nothing is needed from you.');
    await box(prPage({ ...prReview.sent, made: 'CONTRIBUTE', lesson: null }));
    expect(labels()).toEqual([]);
  });

  it('puts what only the person can do in the box: GitHub in a new tab, or a press', async () => {
    await box(prOnlyYouPage('cla'));
    const sign = control('Sign it');
    expect(sign?.getAttribute('href')).toBe('https://cla.example.org/harbor-kit/relay');
    expect(sign?.getAttribute('target')).toBe('_blank');
    expect(sign?.textContent).toContain('(opens in a new tab)');
    const onOnlyYou = vi.fn();
    await box(prOnlyYouPage('dco'), { onOnlyYou });
    await press(control('Sign off and push'));
    await press(control('Do it by hand'));
    expect(onOnlyYou.mock.calls).toEqual([
      ['dco', 'main'],
      ['dco', 'alt'],
    ]);
  });

  it('ends grey and dashed, with GitHub in the text and one way on', async () => {
    await box(prEnds.closed);
    expect(container.querySelector('section')?.className).toContain('border-dashed');
    expect(control('See it on GitHub')?.getAttribute('href')).toBe('https://github.com/harbor-kit/relay/pull/58');
    expect(labels()).toEqual(['Back to Issues']);
    const onRetry = vi.fn();
    await box(prEnds.stoppedEarly, { onRetry });
    await press(control('Try again'));
    expect(onRetry).toHaveBeenCalledOnce();
    await box(prEnds.stoppedEarly);
    expect(labels()).toEqual(['Back to Issues']);
  });

  it('opens only safe addresses in a new tab: GitHub, or any https page for a CLA', async () => {
    await box(
      prPage({
        ...prOnlyYouPage('conversation'),
        onlyYou: [{ ...prCla, kind: 'conversation', url: 'https://evil.example/x' }],
      }),
    );
    expect(control('Answer on GitHub')).toBeNull();
    await box(prPage({ ...prOnlyYouPage('cla'), onlyYou: [{ ...prCla, url: 'javascript:alert(1)' }] }));
    expect(control('Sign it')).toBeNull();
    await box(prPage({ ...prEnds.closed, url: 'https://evil.example/pull/58' }));
    expect(control('See it on GitHub')).toBeNull();
  });

  it('stops a hosted round at the limit: try again, or finish it by hand, with no amount', async () => {
    const onRetry = vi.fn();
    await box(prContribute.stoppedAtLimit, { onRetry, stoppedAtLimit: true });
    expect(container.querySelector('h2')?.textContent).toBe('Round 2 stopped at your limit');
    expect(labels()).toEqual(['Try again', 'Finish it by hand on GitHub']);
    expect(control('Finish it by hand on GitHub')?.getAttribute('href')).toBe(
      'https://github.com/harbor-kit/relay/pull/58',
    );
    expect(text()).not.toContain('$');
    await press(control('Try again'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('counts only the rounds answered in "Merged after N rounds"', async () => {
    await box(prEnds.mergedSkipped);
    expect(container.querySelector('h2')?.textContent).toBe('Merged after 2 rounds. Your code is in harbor-kit/relay');
  });

  it('says what became of the pull request under the box', async () => {
    await render(<PullRequestOutcomeLine outcome="REPO_OUT" />);
    expect(text()).toBe(
      'This project asked GitRanks to stop: we post nothing more here. You can go on by hand on GitHub.',
    );
    await render(<PullRequestOutcomeLine outcome={null} />);
    expect(text()).toBe('');
  });
});

describe('the two cards', () => {
  it('draws both quiet while empty', async () => {
    await render(<PullRequestCards page={prStages.fixing} now={PR_NOW} links={prLinks} />);
    expect(container.querySelector('[data-card="change"]')?.textContent).toBe('The changeNot written yet.');
    expect(container.querySelector('[data-card="walkthrough"]')?.textContent).toBe(
      'The walkthroughWritten after the fix.',
    );
    expect(container.querySelector('[data-card="change"]')?.className).toContain('border-dashed');
  });

  it('leads to the change and to the answers', async () => {
    await render(<PullRequestCards page={prStages.open} now={PR_NOW} links={prLinks} />);
    expect(control('Read the change')?.getAttribute('href')).toBe(prLinks.change);
    expect(container.querySelector('[data-card="walkthrough"]')?.textContent).toContain(
      'Passed on 21 Oct. 3 people read it. Your answers are shared.',
    );
    expect(control('See your answers')?.getAttribute('href')).toBe(prLinks.answers);
  });

  it('says there is no walkthrough when the fix stopped before one', async () => {
    await render(<PullRequestCards page={prEnds.stoppedEarly} now={PR_NOW} links={prLinks} />);
    expect(container.querySelector('[data-card="walkthrough"]')?.textContent).toBe('The walkthroughNo walkthrough.');
  });

  it("has the pull request's text in Contribute, in the walkthrough's place", async () => {
    await render(<PullRequestCards page={prContribute.asked} now={PR_NOW} links={prLinks} />);
    expect(container.querySelector('[data-card="walkthrough"]')).toBeNull();
    expect(container.querySelector('[data-pr-cards]')?.getAttribute('data-pr-cards')).toBe('pair');
    expect(control('Read or edit it')?.getAttribute('href')).toBe(prLinks.pullRequestText);
  });

  it('gives the change the whole row when it is the only card', async () => {
    await render(
      <PullRequestCards page={prContribute.asked} now={PR_NOW} links={{ ...prLinks, pullRequestText: undefined }} />,
    );
    expect(container.querySelectorAll('[data-card]')).toHaveLength(1);
    expect(container.querySelector('[data-pr-cards]')?.getAttribute('data-pr-cards')).toBe('one');
    expect(container.querySelector('[data-pr-cards]')?.className).not.toContain('sm:grid-cols-2');
  });

  it('opens GitHub in a new tab, marked, once the pull request is open', async () => {
    const github = 'https://github.com/harbor-kit/relay/pull/58';
    await render(
      <PullRequestCards
        page={prContribute.asked}
        now={PR_NOW}
        links={{ change: `${github}/files` as Route, pullRequestText: github as Route }}
      />,
    );
    for (const [label, href] of [
      ['Read the change', `${github}/files`],
      ['Read or edit it', github],
    ]) {
      const link = control(label);
      expect(link?.getAttribute('href')).toBe(href);
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toBe(`${label} ↗ (opens GitHub)`);
      expect(link?.querySelector('.sr-only')?.textContent).toBe(' (opens GitHub)');
    }
  });

  it('keeps our own pages in the same tab, unmarked', async () => {
    await render(<PullRequestCards page={prContribute.asked} now={PR_NOW} links={prLinks} />);
    expect(control('Read or edit it')?.getAttribute('target')).toBeNull();
    expect(control('Read or edit it')?.textContent).toBe('Read or edit it');
  });

  it("draws the change's `code` as code, never its backticks", async () => {
    const page = { ...prStages.open, change: { ...prStages.open.change, summary: 'Caps `retries` at `max`.' } };
    await render(<PullRequestCards page={page as PullRequestPage} now={PR_NOW} links={prLinks} />);
    const card = container.querySelector('[data-card="change"]');
    expect([...(card?.querySelectorAll('code') ?? [])].map((code) => code.textContent)).toEqual(['retries', 'max']);
    expect(card?.textContent).toContain('Caps retries at max.');
    expect(card?.textContent).not.toContain('`');
  });

  it('shows the public page of the fix with a button that copies it', async () => {
    await render(<FixLinkLine url={prLinks.fix} />);
    expect(text()).toContain('gitranks.com/learn/fixes/harbor-kit/relay/58');
    expect(control('Copy the link')).not.toBeNull();
  });
});

describe('more waiting, in the box', () => {
  const line = () => container.querySelector<HTMLButtonElement>('[data-more-waiting] > button');
  const list = () => container.querySelector<HTMLUListElement>('[data-more-waiting] ul');
  const items = () =>
    [...container.querySelectorAll('[data-more-waiting-item]')].map((each) => each.getAttribute('data-more-waiting-item'));

  it('has no line when nothing else waits, and never a zero', async () => {
    await box(prOnlyYouPage('cla'), { onOnlyYou: vi.fn() });
    expect(container.querySelector('[data-more-waiting]')).toBeNull();
    expect(text()).not.toMatch(/more waiting/);
    await box(prStages.open);
    expect(container.querySelector('[data-more-waiting]')).toBeNull();
  });

  it('says "1 more waiting" for one', async () => {
    await box(prOnlyYouPage('cla', 'dco'), { onOnlyYou: vi.fn() });
    expect(wordsOf(line() as Element)).toBe('1 more waiting');
  });

  it('counts several, closed until pressed', async () => {
    await box(prOnlyYouPage('cla', 'dco', 'title'), { onOnlyYou: vi.fn() });
    expect(wordsOf(line() as Element)).toBe('2 more waiting');
    expect(line()?.getAttribute('type')).toBe('button');
    expect(line()?.getAttribute('aria-expanded')).toBe('false');
    expect(line()?.getAttribute('aria-controls')).toBe(list()?.id);
    expect(list()?.hidden).toBe(true);
  });

  it('opens the rest in place when pressed, each with its own button, and closes again', async () => {
    const onOnlyYou = vi.fn();
    await box(prOnlyYouPage('cla', 'dco', 'title'), { onOnlyYou });
    const before = window.location.href;
    await press(line());
    expect(line()?.getAttribute('aria-expanded')).toBe('true');
    expect(list()?.hidden).toBe(false);
    expect(window.location.href).toBe(before);
    expect(container.querySelector('[data-more-waiting]')?.closest('[data-box]')).not.toBeNull();
    await press(control('Rename it'));
    expect(onOnlyYou).toHaveBeenCalledWith('title', 'main');
    await press(line());
    expect(list()?.hidden).toBe(true);
  });

  it("is reached by keyboard, and Enter on it is its own, not the box's main action", async () => {
    const onOnlyYou = vi.fn();
    await box(prOnlyYouPage('dco', 'title'), { onOnlyYou });
    const button = line() as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.tabIndex).toBe(0);
    button.focus();
    expect(document.activeElement).toBe(button);
    await act(async () => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(onOnlyYou).not.toHaveBeenCalled();
    // A browser turns Enter on a focused button into its click.
    await press(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('does not repeat the job the box shows', async () => {
    await box(prOnlyYouPage('cla', 'dco', 'title'), { onOnlyYou: vi.fn() });
    expect(container.querySelector('[data-box] h2')?.textContent).toBe('Sign the project’s agreement');
    expect(items()).toEqual(['dco', 'title']);
    expect(container.querySelectorAll('[data-more-waiting] a[target="_blank"]')).toHaveLength(0);
  });

  it('lists every one when the box is about something else', async () => {
    await box(prReview.asked);
    expect(wordsOf(line() as Element)).toBe('1 more waiting');
    expect(items()).toEqual(['cla']);
    expect(container.querySelector('[data-more-waiting] a')?.getAttribute('target')).toBe('_blank');
  });

  it('draws opened when asked to (the catalogue)', async () => {
    await box(prOnlyYouPage('cla', 'dco'), { onOnlyYou: vi.fn(), initialMoreOpen: true });
    expect(line()?.getAttribute('aria-expanded')).toBe('true');
    expect(list()?.hidden).toBe(false);
  });
});

describe('the foot links', () => {
  it("opens the project's rules in place, and discards only once the person said yes", async () => {
    const onDiscard = vi.fn();
    await render(<PullRequestFootLinks rules={prStages.walkthrough.rules} onDiscard={onDiscard} />);
    const rules = container.querySelector<HTMLElement>('[data-rules]');
    expect(rules?.hidden).toBe(true);
    await press(control('The project’s rules for pull requests'));
    expect(rules?.hidden).toBe(false);
    await press(control('Discard this fix'));
    expect(onDiscard).not.toHaveBeenCalled();
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard this fix?');
    expect(dialog?.textContent).toContain('Nothing is submitted, and the issue goes back to the pool.');
    const confirm = [...(dialog?.querySelectorAll('button') ?? [])].find((each) => each.textContent === 'Discard');
    await press(confirm ?? null);
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(control('Close this pull request')).toBeNull();
  });

  it('holds the discard while a call is under way', async () => {
    await render(<PullRequestFootLinks rules={null} onDiscard={vi.fn()} discarding />);
    expect((control('Discard this fix') as HTMLButtonElement | null)?.disabled).toBe(true);
  });
});
