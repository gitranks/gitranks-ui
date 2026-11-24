// @vitest-environment jsdom
import type { Route } from 'next';
import { act, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HOLD_OVER_SAID, IssuePageScreen, type IssuePageScreenProps } from './issue-page-screen';
import {
  fullPage,
  issueNumbers,
  issuePage,
  looksAtLimit,
  MASKED_NOW,
  openAppeal,
} from '@/lib/workspace/__fixtures__/masked-issue';
import type { IssuePage } from '@/lib/workspace/masked-issue.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
// The window's dialog asks the width of the screen.
window.matchMedia ??= ((query: string) => ({
  matches: true,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(MASKED_NOW);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const BACK = { href: '/learn/earlier' as const, label: 'Issues' };
const render = (node: ReactNode) => act(async () => root.render(node));
const screen = (page: IssuePage, props: Partial<IssuePageScreenProps> = {}) =>
  render(
    <IssuePageScreen
      page={page}
      from="learn"
      back={BACK}
      numbers={issueNumbers}
      now={MASKED_NOW}
      timeZone="UTC"
      start={{ agents: { own: true, hosted: false }, ownName: 'Claude Code' }}
      {...props}
    />,
  );
const state = () => container.querySelector('[data-issue-page]')?.getAttribute('data-issue-page');
const h1 = () => container.querySelector('h1')?.textContent;
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find(
    (each) => each.textContent?.replace('⏎', '').trim() === label,
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });
const enter = () =>
  act(async () => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });

describe('before the press', () => {
  it('shows the masked card, the button with Enter, the hold, the window and the day', async () => {
    const onSee = vi.fn();
    await screen(issuePage(), { onSee });
    expect(state()).toBe('MASKED');
    expect(h1()).toBe('Tags show twice in a sidebar after one of them is renamed');
    expect(container.querySelector('a[href*="github.com"]')).toBeNull();
    expect(container.querySelector('[data-press-line]')?.textContent).toBe(
      'Held for you for 15 minutes. You can give it back at any time.',
    );
    expect(container.querySelector('[data-why-hidden-link]')?.textContent).toBe('Why do we hide issue details?');
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      'You can see 20 full issues a day. 17 left today.',
    );
    await press(button('See the full issue'));
    await enter();
    expect(onSee).toHaveBeenCalledTimes(2);
  });

  it('says the press gives back the issue held now', async () => {
    await screen(issuePage({ holding: { id: 'x', until: '2026-10-28T12:09:00.000Z' } }));
    expect(container.querySelector('[data-press-line]')?.textContent).toBe(
      'You hold another issue for 9 more minutes. Seeing this one gives that one back.',
    );
  });

  it('tells a visitor that seeing one needs a sign-in and costs no money', async () => {
    await screen(issuePage({ looks: null }), { visitor: true });
    expect(container.textContent).toContain('Seeing an issue in full needs a GitHub sign-in. It costs no money.');
  });

  it('waits in its place while the press is on its way', async () => {
    const onSee = vi.fn();
    await screen(issuePage(), { onSee, pressing: true });
    await press(button('Opening…'));
    await enter();
    expect(onSee).not.toHaveBeenCalled();
  });

  it('names the project on a page about one project, and keeps the title rewritten', async () => {
    await screen(issuePage({ masked: { ...issuePage().masked!, project: 'acme/notebook' } }));
    expect(container.textContent).toContain('acme/notebook');
    expect(container.textContent).not.toContain('#1290');
  });
});

describe('after the press', () => {
  it('holds the issue with its end and minutes, shows it in full, then the form and "Not for me", one under the other', async () => {
    const onGiveBack = vi.fn();
    await screen(fullPage(), { onGiveBack });
    expect(state()).toBe('FULL');
    expect(container.querySelector('[data-held]')?.textContent).toBe(
      'Held for you until 12:14 · 14 minutes leftNobody else sees this issue while you hold it.',
    );
    const card = container.querySelector('[data-issue-card="full"]');
    expect(card?.textContent).toContain('acme/notebook');
    expect(card?.textContent).toContain('Issue #1290');
    expect(card?.textContent).toContain('18.4k stars');
    expect(card?.querySelector('[data-masked-facts]')).not.toBeNull();
    expect(h1()).toBe('Duplicate tags appear in the sidebar after a rename');
    expect(button('Read the whole thread on GitHub ↗ (opens GitHub)')?.getAttribute('href')).toBe(
      'https://github.com/acme/notebook/issues/1290',
    );
    expect([...container.querySelectorAll('[data-hints] li')].map((each) => each.textContent)).toEqual([
      'A maintainer agreed it should be fixed',
      'Merges outside pull requests',
      'No agreement to sign',
    ]);
    const order = [...container.querySelectorAll('[data-start-form], [data-not-for-me]')];
    expect(order.map((each) => (each.hasAttribute('data-start-form') ? 'form' : 'not for me'))).toEqual([
      'form',
      'not for me',
    ]);
    await press(button('Give it back'));
    expect(onGiveBack).toHaveBeenCalledOnce();
  });

  it('counts the minutes down, and says in place when the 15 minutes are over', async () => {
    await screen(fullPage());
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    expect(container.querySelector('[data-held]')?.textContent).toContain('9 minutes left');
    await act(async () => {
      vi.advanceTimersByTime(9 * 60_000);
    });
    expect(state()).toBe('EXPIRED');
    expect(h1()).toBe('The 15 minutes are over');
  });

  it('takes the focus to the new heading, says the end of the minutes once, and stops its clock', async () => {
    await screen(issuePage());
    expect(document.activeElement).toBe(document.body);
    await screen(fullPage());
    expect(document.activeElement).toBe(container.querySelector('h1'));
    expect(document.activeElement?.textContent).toBe('Duplicate tags appear in the sidebar after a rename');
    const said = () => container.querySelector('[data-page-said]')?.textContent;
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    // The countdown says nothing.
    expect(said()).toBe('');
    await act(async () => {
      vi.advanceTimersByTime(9 * 60_000);
    });
    expect(container.querySelector('[data-page-said]')?.getAttribute('aria-live')).toBe('polite');
    expect(said()).toBe(HOLD_OVER_SAID);
    expect(document.activeElement?.textContent).toBe('The 15 minutes are over');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('writes the end of the hold only in the browser when no zone is given, so the two renders agree', async () => {
    const node = (
      <IssuePageScreen
        page={fullPage()}
        from="learn"
        back={BACK}
        numbers={issueNumbers}
        now={MASKED_NOW}
        start={{ agents: { own: true, hosted: false }, ownName: 'Claude Code' }}
      />
    );
    const html = renderToString(node);
    expect(html).toContain('Held for you · 14 minutes left');
    expect(html).not.toContain('until');
    act(() => root.unmount());
    container.innerHTML = html;
    const errors = vi.fn();
    await act(async () => {
      root = hydrateRoot(container, node, { onRecoverableError: errors });
    });
    expect(errors).not.toHaveBeenCalled();
    expect(container.querySelector('[data-held]')?.textContent).toMatch(
      /^Held for you until \d\d:\d\d · 14 minutes left/,
    );
  });

  it('says when the project asks for an agreement to be signed', async () => {
    await screen(fullPage({ full: { ...fullPage().full!, agreementToSign: true } }));
    expect(container.textContent).toContain('The project asks you to sign an agreement before it merges.');
    expect(container.textContent).not.toContain('No agreement to sign');
  });
});

describe('after giving back', () => {
  it('shows the reasons saved and the way back to the list', async () => {
    await screen(issuePage({ state: 'GIVEN_BACK', reasons: ['FIXED'] }));
    expect(h1()).toBe('You gave this issue back');
    expect(container.querySelector('[aria-pressed="true"]')?.textContent).toBe('It is already fixed');
    expect(button('Back to Issues')?.getAttribute('href')).toBe('/learn/earlier');
  });
});

describe('the other ends', () => {
  it.each([
    ['EXPIRED', 'The 15 minutes are over', 'See the full issue again'],
    ['REPLACED', 'You gave this issue back when you saw another', 'See the full issue again'],
    ['TAKEN', 'Someone else is looking at this issue', 'Back to Issues'],
    ['LEFT_POOL', 'This issue is no longer open for a fix', 'Back to Issues'],
    ['NOT_AVAILABLE', 'This issue is not on your list', 'Back to Issues'],
  ] as const)('%s: one sentence and one way on', async (end, title, way) => {
    const onSee = vi.fn();
    await screen(issuePage({ state: end }), { onSee });
    expect(state()).toBe(end);
    expect(h1()).toBe(title);
    expect(container.querySelector('[data-end] p')?.textContent).not.toMatch(/—/);
    expect(button(way)).not.toBeNull();
    await enter();
    if (way === 'See the full issue again') expect(onSee).toHaveBeenCalledOnce();
  });

  it.each(['EXPIRED', 'REPLACED'] as const)('%s: waits in its place while the press is on its way', async (end) => {
    const onSee = vi.fn();
    await screen(issuePage({ state: end }), { onSee, pressing: true });
    const opening = button('Opening…');
    expect(opening?.getAttribute('aria-disabled')).toBe('true');
    expect(button('See the full issue again')).toBeNull();
    await press(opening);
    await enter();
    expect(onSee).not.toHaveBeenCalled();
  });

  it("says at the day's limit what the tier gives, when more come, and links the window", async () => {
    await screen(issuePage({ state: 'LIMIT', looks: looksAtLimit }));
    expect(h1()).toBe('You have seen 10 full issues today');
    expect(container.textContent).toContain('That is the most for your GitRanks tier, Rookie.');
    expect(container.querySelector('[data-why-hidden-link]')).not.toBeNull();
  });

  it('goes to the work on an issue the person started', async () => {
    await screen(issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }));
    expect(h1()).toBe('You started this issue');
    expect(button('Go to its page')?.getAttribute('href')).toBe('/my/pull-requests/acme/notebook/1290');
  });

  it('shows a closed access with the request to look again in place of the page', async () => {
    await screen(issuePage(), { suspended: { appeal: openAppeal } });
    expect(container.querySelector('[data-fair-use-appeal]')).not.toBeNull();
    expect(container.querySelector('[data-issue-card]')).toBeNull();
  });
});

describe("the page of one issue: Learn's parts", () => {
  const LESSON = { title: 'A queue: first in, first out', href: '/learn/lessons/a-queue' as Route, learned: false };
  const lessonLine = () => container.querySelector('[data-lesson]')?.textContent;
  const STARTED = { agent: 'Claude Code', at: '2026-10-28T11:48:00.000Z', walkthrough: true };
  const startedPage = issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' });

  it('says the lesson and why on the masked card, which names no project', async () => {
    await screen(issuePage(), { lesson: LESSON });
    expect(lessonLine()).toBe('Teaches A queue: first in, first out, which is new for you.');
    expect(container.querySelector('[data-lesson] a')?.getAttribute('href')).toBe('/learn/lessons/a-queue');
    expect(container.textContent).not.toMatch(/acme|#1290/);
  });

  it('says it on the full issue too, as "Uses" once the lesson is learned', async () => {
    await screen(fullPage(), { lesson: { ...LESSON, learned: true } });
    expect(lessonLine()).toBe('Uses A queue: first in, first out, which you learned.');
  });

  it('has no "How" step for an issue kept for learners', async () => {
    await screen(fullPage(), { learnOnly: true });
    const steps = [...container.querySelectorAll('[data-step] h3')].map((each) => each.textContent);
    expect(steps).toEqual(['Your agent', 'Paste this in Claude Code']);
    expect(container.querySelector('[data-learn-only]')).not.toBeNull();
  });

  it('says in one line how the work started, with the walkthrough or without', async () => {
    await screen(startedPage, { started: STARTED });
    expect(container.querySelector('[data-end="STARTED"] p')?.textContent).toBe(
      'Claude Code started it 12 minutes ago, with the walkthrough. Its page shows each step as it goes.',
    );
    await screen(startedPage, { started: { ...STARTED, walkthrough: false } });
    expect(container.textContent).toContain('Claude Code started it 12 minutes ago, without the walkthrough.');
    expect(container.textContent).not.toMatch(/—/);
  });

  it("keeps today's words without the started line", async () => {
    await screen(startedPage);
    expect(container.querySelector('[data-end="STARTED"] p')?.textContent).toBe(
      'Your agent is on it. Its page shows each step as it goes.',
    );
  });
});
