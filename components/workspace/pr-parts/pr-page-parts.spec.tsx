// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AlsoWaiting } from './also-waiting';
import { PullRequestFootLinks } from './foot-links';
import { PullRequestIssueCard } from './issue-card';
import { PullRequestBox, PullRequestOutcomeLine } from './pr-box';
import { FixLinkLine, PullRequestCards } from './pr-cards';
import { StageStrip } from './stage-strip';
import {
  PR_NOW,
  prContribute,
  prEnds,
  prLinks,
  prOnlyYouPage,
  prReview,
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
const control = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) =>
    each.textContent?.replace('⏎', '').replace('(opens GitHub)', '').replace('↗', '').trim().startsWith(label),
  ) ?? null;
const labels = () =>
  [...container.querySelectorAll<HTMLElement>('[data-box-actions] a, [data-box-actions] button')].map((each) =>
    each.textContent?.replace('⏎', '').replace('(opens GitHub)', '').replace('↗', '').trim(),
  );
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No control');
    element.click();
  });
const enter = () =>
  act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
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
      (span) => !span.className.includes('max-sm:hidden'),
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

    const onSendRound = vi.fn();
    const onSendBack = vi.fn();
    await box(prReview.ready, { onSendRound, onSendBack });
    expect(labels()).toEqual(['Send round 2: 2 commits and 8 replies', 'Send it back to your agent']);
    await enter();
    expect(onSendRound).toHaveBeenCalledWith(2);
    await press(control('Send it back to your agent'));
    expect(onSendBack).toHaveBeenCalledOnce();
  });

  it('puts what only the person can do in the box: GitHub in a new tab, or a press', async () => {
    await box(prOnlyYouPage('cla'));
    const sign = control('Sign it on GitHub');
    expect(sign?.getAttribute('href')).toBe('https://cla.example.org/harbor-kit/relay');
    expect(sign?.getAttribute('target')).toBe('_blank');
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
    await box(prEnds.stoppedEarly, { onRetry, retryLabel: 'Retry with a budget of $4.00' });
    await press(control('Retry with a budget of $4.00'));
    expect(onRetry).toHaveBeenCalledOnce();
    await box(prEnds.stoppedEarly);
    expect(labels()).toEqual(['Back to Issues']);
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

  it("has the pull request's text in Contribute, in the walkthrough's place", async () => {
    await render(<PullRequestCards page={prContribute.asked} now={PR_NOW} links={prLinks} />);
    expect(container.querySelector('[data-card="walkthrough"]')).toBeNull();
    expect(control('Read or edit it')?.getAttribute('href')).toBe(prLinks.pullRequestText);
  });

  it('shows the public page of the fix with a button that copies it', async () => {
    await render(<FixLinkLine url={prLinks.fix} />);
    expect(text()).toContain('gitranks.com/learn/fixes/harbor-kit/relay/58');
    expect(control('Copy the link')).not.toBeNull();
  });
});

describe('also waiting for you', () => {
  it('lists the others under the box, each with its own button', async () => {
    await render(<AlsoWaiting onlyYou={prReview.asked.onlyYou} />);
    expect(container.querySelector('h2')?.textContent).toBe('Also waiting for you');
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(control('Sign it on GitHub')?.getAttribute('target')).toBe('_blank');
  });

  it('is left out when only one thing waits', async () => {
    await render(<AlsoWaiting onlyYou={prOnlyYouPage('cla').onlyYou} />);
    expect(container.querySelector('[data-also-waiting]')).toBeNull();
  });
});

describe('the foot links', () => {
  it("opens the project's rules in place, and discards or closes on a press", async () => {
    const onDiscard = vi.fn();
    await render(<PullRequestFootLinks rules={prStages.walkthrough.rules} onDiscard={onDiscard} />);
    const rules = container.querySelector<HTMLElement>('[data-rules]');
    expect(rules?.hidden).toBe(true);
    await press(control('The project’s rules for pull requests'));
    expect(rules?.hidden).toBe(false);
    await press(control('Discard this fix'));
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(control('Close this pull request')).toBeNull();
  });
});
