// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MaskedListReads } from '@/lib/workspace/masked-issue';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const actions = vi.hoisted(() => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);

const { MASKED_LIST_NOTICES, MaskedList, MaskedListRow } = await import('./masked-list');
const { BAN_TEXT, TAKEN_NOTE, VISITOR_LOOKS_LINE } = await import('@/lib/workspace/masked-issue');
const { issueNumbers, issuePage, looksAtLimit, looksToday, maskedIssue, maskedIssues } = await import(
  '@/lib/workspace/__fixtures__/masked-issue'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  for (const action of Object.values(actions)) action.mockReset();
  router.push.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
});

/** A loop's next round starts from a list never drawn before. */
const remount = () => {
  act(() => root.unmount());
  root = createRoot(container);
};

const render = (node: ReactNode) => act(async () => root.render(node));
const text = () => container.textContent ?? '';
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) => each.textContent?.trim() === label) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });
const status = () => container.querySelector('[data-list-status]')?.textContent ?? null;
const rowState = () => container.querySelector('[data-masked-row]')?.getAttribute('data-row-state');

const NUMBERS = { read: issueNumbers.read, kept: issueNumbers.kept };
const LIVE = { looks: looksToday(), numbers: NUMBERS };
/** A day that is not read: signed out, or a read that failed. */
const UNREAD = { looks: null, numbers: NUMBERS };
const looked = (outcome: string, page: unknown = null) => ({ ok: true, data: { outcome, page } });

describe('the foot under a list of masked issues', () => {
  it('says the day, with the link to why issue details are hidden', async () => {
    await render(
      <MaskedList from="contribute" pageFrom="contribute" reads={LIVE}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    expect(button('Why do we hide issue details?')).not.toBeNull();
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      'You can see 20 full issues a day. 17 left today.',
    );
    expect(container.querySelector('[data-list-status]')?.getAttribute('role')).toBe('status');
  });

  it('has the link alone while the day cannot be read', async () => {
    await render(
      <MaskedList from="contribute" pageFrom="contribute" reads={UNREAD}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    expect(button('Why do we hide issue details?')).not.toBeNull();
    expect(container.querySelector('[data-looks-line]')).toBeNull();
  });

  it("says a visitor's line under a visitor's list, which has no Skip", async () => {
    await render(
      <MaskedList from="learn" pageFrom="learn" visitor reads={UNREAD}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    expect(text()).toContain(VISITOR_LOOKS_LINE);
    expect(button('Skip')).toBeNull();
  });

  it('is left out when the list asks for none', async () => {
    await render(
      <MaskedList from="contribute" pageFrom="contribute" foot={false}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    expect(container.querySelector('[data-masked-foot]')).toBeNull();
  });
});

describe('"See the full issue" in a list', () => {
  const list = (props: { onLeave?: () => void; reads?: MaskedListReads } = {}) =>
    render(
      <MaskedList from="contribute" pageFrom="contribute" reads={props.reads ?? LIVE}>
        <MaskedListRow issue={maskedIssue()} onLeave={props.onLeave} />
      </MaskedList>,
    );

  it("holds it, counted where it was pressed, and opens the issue's page", async () => {
    actions.lookAtIssue.mockResolvedValue(looked('OK'));
    await list();
    await press(button('See the full issue'));
    expect(actions.lookAtIssue).toHaveBeenCalledWith('q7k2m9xa', 'contribute');
    expect(router.push).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=contribute');
  });

  it('waits in place while the press is sent', async () => {
    let done: (value: unknown) => void = () => undefined;
    actions.lookAtIssue.mockReturnValue(new Promise((resolve) => (done = resolve)));
    await list();
    await press(button('See the full issue'));
    expect(rowState()).toBe('opening');
    await act(async () => done(looked('OK')));
  });

  it('says someone else holds it, and "Show the next one" takes the row away', async () => {
    const onLeave = vi.fn();
    actions.lookAtIssue.mockResolvedValue(looked('TAKEN'));
    await list({ onLeave });
    await press(button('See the full issue'));
    expect(rowState()).toBe('taken');
    expect(status()).toBe(TAKEN_NOTE);
    await press(button('Show the next one'));
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it("dims every row at the day's limit, with the day's numbers", async () => {
    actions.lookAtIssue.mockResolvedValue(looked('LIMIT', issuePage({ looks: looksAtLimit })));
    await render(
      <MaskedList from="contribute" pageFrom="contribute" reads={LIVE}>
        <MaskedListRow issue={maskedIssues[0]} />
        <MaskedListRow issue={maskedIssues[1]} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    const states = [...container.querySelectorAll('[data-masked-row]')].map((row) =>
      row.getAttribute('data-row-state'),
    );
    expect(states).toEqual(['limit', 'limit']);
    expect(text()).toContain('You have seen 10 full issues today. More at 00:00 UTC.');
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      // The line under the list says the same once, never a zero.
      'You have seen 10 full issues today. More at 00:00 UTC.',
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("says the day's limit in the status line when the answer has no numbers", async () => {
    actions.lookAtIssue.mockResolvedValue(looked('LIMIT', null));
    await list({ reads: UNREAD });
    await press(button('See the full issue'));
    expect(rowState()).toBe('limit');
    expect(status()).toBe(MASKED_LIST_NOTICES.limit);
  });

  it('takes the day read again after a refresh, or on the way back to the page', async () => {
    await list({ reads: { ...LIVE, looks: looksAtLimit } });
    expect(rowState()).toBe('limit');
    await list({ reads: LIVE });
    expect(rowState()).toBe('masked');
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      'You can see 20 full issues a day. 17 left today.',
    );
    await list({ reads: { ...LIVE, looks: looksAtLimit } });
    expect(rowState()).toBe('limit');
  });

  it('starts dimmed when no full issue is left today', async () => {
    await list({ reads: { ...LIVE, looks: looksAtLimit } });
    expect(rowState()).toBe('limit');
    await press(button('See the full issue'));
    expect(actions.lookAtIssue).not.toHaveBeenCalled();
  });

  it('takes away an issue that is no longer open, and says so', async () => {
    for (const outcome of ['NOT_AVAILABLE', 'LEFT_POOL']) {
      const onLeave = vi.fn();
      actions.lookAtIssue.mockResolvedValue(looked(outcome));
      await list({ onLeave });
      await press(button('See the full issue'));
      expect(onLeave, outcome).toHaveBeenCalledOnce();
      expect(status()).toBe(MASKED_LIST_NOTICES.gone);
      remount();
    }
  });

  it('removes the row itself when the list does not', async () => {
    actions.lookAtIssue.mockResolvedValue(looked('LEFT_POOL'));
    await list();
    await press(button('See the full issue'));
    expect(container.querySelector('[data-masked-row]')).toBeNull();
  });

  it('dims the list and says the access is closed', async () => {
    actions.lookAtIssue.mockResolvedValue(looked('SUSPENDED'));
    await list();
    await press(button('See the full issue'));
    expect(rowState()).toBe('limit');
    expect(status()).toBe(BAN_TEXT);
    expect(container.querySelector('[data-row-note]')).toBeNull();
  });

  it('keeps the row as it was when the press does not go through', async () => {
    for (const failure of [
      async () => ({ ok: false, error: 'FAILED' }),
      async () => Promise.reject(new Error('down')),
    ]) {
      actions.lookAtIssue.mockImplementation(failure);
      await list();
      await press(button('See the full issue'));
      expect(rowState()).toBe('masked');
      expect(status()).toBe(MASKED_LIST_NOTICES.look);
      remount();
    }
    expect(router.push).not.toHaveBeenCalled();
  });

  it("is a visitor's GitHub sign-in, back to the issue's page", async () => {
    await render(
      <MaskedList from="learn" pageFrom="learn" visitor reads={UNREAD}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    const form = actions.signInToSeeIssue.mock.calls[0][0] as FormData;
    expect([form.get('id'), form.get('from')]).toEqual(['q7k2m9xa', 'learn']);
    expect(actions.lookAtIssue).not.toHaveBeenCalled();
  });

  it("carries Learn's Issues view to the issue's page, and through a visitor's sign-in", async () => {
    actions.lookAtIssue.mockResolvedValue(looked('OK'));
    await render(
      <MaskedList from="learn" pageFrom="learn" pageView="lesson=a-queue&learned=1" reads={LIVE}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    expect(router.push).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=learn&lesson=a-queue&learned=1');
    remount();
    await render(
      <MaskedList from="learn" pageFrom="learn" pageView="lesson=a-queue" visitor reads={UNREAD}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    const form = actions.signInToSeeIssue.mock.calls[0][0] as FormData;
    expect(form.get('view')).toBe('lesson=a-queue');
  });

  it("counts a press on the owner's profile as the profile's", async () => {
    actions.lookAtIssue.mockResolvedValue(looked('OK'));
    await render(
      <MaskedList from="profile" pageFrom="learn">
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    expect(actions.lookAtIssue).toHaveBeenCalledWith('q7k2m9xa', 'profile');
    expect(router.push).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=learn');
  });
});

describe('Skip in a list', () => {
  const skip = async (reason: string) => {
    await press(button('Skip'));
    await press(button(reason));
  };

  it('hands the next issue to the list for its place, leaving out the rows still shown', async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: maskedIssues[2] });
    const onReplace = vi.fn();
    await render(
      <MaskedList from="learn" pageFrom="learn">
        <MaskedListRow issue={maskedIssues[0]} onReplace={onReplace} />
        <MaskedListRow issue={maskedIssues[1]} onReplace={onReplace} />
      </MaskedList>,
    );
    await skip('Too hard for me');
    expect(actions.skipMaskedIssue).toHaveBeenCalledWith('q7k2m9xa', 'learn', 'TOO_HARD', ['r3n8p1vd']);
    expect(onReplace).toHaveBeenCalledExactlyOnceWith(maskedIssues[2]);
  });

  it('says it is skipped when no issue takes its place, or the list keeps its own order', async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: null });
    await render(
      <MaskedList from="learn" pageFrom="learn">
        <MaskedListRow issue={maskedIssue()} onReplace={vi.fn()} />
      </MaskedList>,
    );
    await skip('Not interesting to me');
    expect(text()).toContain('Skipped. It will not be shown to you again.');

    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: maskedIssues[2] });
    await render(
      <MaskedList from="contribute" pageFrom="contribute">
        <MaskedListRow key="other" issue={maskedIssues[1]} />
      </MaskedList>,
    );
    await skip('Not interesting to me');
    expect(actions.skipMaskedIssue).toHaveBeenLastCalledWith('r3n8p1vd', 'contribute', 'NOT_INTERESTING', []);
    expect(container.querySelector('[data-masked-row="t5w0c4hy"]')).toBeNull();
  });

  it('says so when the skip does not go through', async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: false, error: 'FAILED' });
    await render(
      <MaskedList from="contribute" pageFrom="contribute">
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await skip('Too hard for me');
    expect(status()).toBe(MASKED_LIST_NOTICES.skip);
    // The row is back as it was, never "Skipped" for a skip that was not made.
    expect(rowState()).toBe('masked');
    expect(text()).not.toContain('Skipped.');
  });
});

describe('a list while the person holds an issue open', () => {
  const KEY = 'gitranks:held-issue';
  const holdUntil = (id: string, until: string) => window.localStorage.setItem(KEY, JSON.stringify({ id, until }));
  const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
  const states = () =>
    [...container.querySelectorAll('[data-masked-row]')].map((row) => row.getAttribute('data-row-state'));
  const twoRows = () =>
    render(
      <MaskedList from="contribute" pageFrom="contribute" reads={LIVE}>
        <MaskedListRow issue={maskedIssues[0]} />
        <MaskedListRow issue={maskedIssues[1]} />
      </MaskedList>,
    );

  it('says on every other row that seeing it gives the held one back, and the press works as before', async () => {
    holdUntil('r3n8p1vd', inMinutes(10));
    actions.lookAtIssue.mockResolvedValue(looked('OK'));
    await twoRows();
    expect(states()).toEqual(['holding', 'masked']);
    expect(text()).toContain('Seeing this one gives back the issue you hold now.');
    await press(button('See the full issue'));
    expect(actions.lookAtIssue).toHaveBeenCalledWith('q7k2m9xa', 'contribute');
  });

  it("opens the held issue's page from its row without a new press", async () => {
    holdUntil('q7k2m9xa', inMinutes(10));
    await twoRows();
    expect(states()).toEqual(['masked', 'holding']);
    const row = container.querySelector('[data-masked-row="q7k2m9xa"]');
    const see = [...(row?.querySelectorAll<HTMLElement>('button') ?? [])].find(
      (each) => each.textContent?.trim() === 'See the full issue',
    );
    await press(see ?? null);
    expect(actions.lookAtIssue).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=contribute');
  });

  it('says nothing of a hold that ended, was cleared, or is not a mark', async () => {
    for (const mark of [
      () => holdUntil('r3n8p1vd', inMinutes(-1)),
      () => window.localStorage.removeItem(KEY),
      () => window.localStorage.setItem(KEY, JSON.stringify({ id: '../x', until: 'soon' })),
    ]) {
      mark();
      await twoRows();
      expect(states()).toEqual(['masked', 'masked']);
      remount();
    }
  });

  it('follows the mark as the page writes and clears it, and ends it at its time', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { clearHeldMark, writeHeldMark } = await import('@/lib/workspace/held-mark');
    await twoRows();
    expect(states()).toEqual(['masked', 'masked']);
    await act(async () => writeHeldMark({ id: 'r3n8p1vd', until: inMinutes(2) }));
    expect(states()).toEqual(['holding', 'masked']);
    await act(async () => clearHeldMark('r3n8p1vd'));
    expect(states()).toEqual(['masked', 'masked']);
    await act(async () => writeHeldMark({ id: 'r3n8p1vd', until: inMinutes(2) }));
    expect(states()).toEqual(['holding', 'masked']);
    await act(async () => vi.advanceTimersByTime(2 * 60_000 + 100));
    expect(states()).toEqual(['masked', 'masked']);
  });

  it("never shows a visitor's list a hold", async () => {
    holdUntil('r3n8p1vd', inMinutes(10));
    await render(
      <MaskedList from="learn" pageFrom="learn" visitor reads={UNREAD}>
        <MaskedListRow issue={maskedIssues[0]} />
      </MaskedList>,
    );
    expect(rowState()).toBe('masked');
  });
});
