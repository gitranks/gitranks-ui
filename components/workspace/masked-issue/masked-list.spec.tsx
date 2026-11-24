// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
});

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
const LIVE = { rulesLive: true, looks: looksToday(), numbers: NUMBERS };
const BEFORE = { rulesLive: false, looks: null, numbers: NUMBERS };
const looked = (outcome: string, page: unknown = null) => ({ ok: true, data: { outcome, page } });

describe('the foot under a list of masked issues', () => {
  it('says the day once the rules are live, with the link to why issue details are hidden', async () => {
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

  it("has the link alone before the rules are live: today's words", async () => {
    await render(
      <MaskedList from="contribute" pageFrom="contribute" reads={{ ...BEFORE, looks: looksToday() }}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    expect(button('Why do we hide issue details?')).not.toBeNull();
    expect(container.querySelector('[data-looks-line]')).toBeNull();
  });

  it("says a visitor's line under a visitor's list, which has no Skip", async () => {
    await render(
      <MaskedList from="learn" pageFrom="learn" visitor reads={BEFORE}>
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
  const list = (props: { onLeave?: () => void; reads?: typeof LIVE } = {}) =>
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
      'You can see 10 full issues a day. 0 left today.',
    );
    expect(router.push).not.toHaveBeenCalled();
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
    }
    expect(router.push).not.toHaveBeenCalled();
  });

  it("is a visitor's GitHub sign-in, back to the issue's page", async () => {
    await render(
      <MaskedList from="learn" pageFrom="learn" visitor reads={BEFORE}>
        <MaskedListRow issue={maskedIssue()} />
      </MaskedList>,
    );
    await press(button('See the full issue'));
    const form = actions.signInToSeeIssue.mock.calls[0][0] as FormData;
    expect([form.get('id'), form.get('from')]).toEqual(['q7k2m9xa', 'learn']);
    expect(actions.lookAtIssue).not.toHaveBeenCalled();
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

  it("puts the next issue in the row's place, leaving out the rows still shown", async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: maskedIssues[2] });
    await render(
      <MaskedList from="learn" pageFrom="learn">
        <MaskedListRow issue={maskedIssues[0]} replace />
        <MaskedListRow issue={maskedIssues[1]} replace />
      </MaskedList>,
    );
    await skip('Too hard for me');
    expect(actions.skipMaskedIssue).toHaveBeenCalledWith('q7k2m9xa', 'learn', 'TOO_HARD', ['r3n8p1vd']);
    const ids = [...container.querySelectorAll('[data-masked-row]')].map((row) => row.getAttribute('data-masked-row'));
    expect(ids).toEqual(['t5w0c4hy', 'r3n8p1vd']);
  });

  it('says it is skipped when no issue takes its place, or the list keeps its own order', async () => {
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: null });
    await render(
      <MaskedList from="learn" pageFrom="learn">
        <MaskedListRow issue={maskedIssue()} replace />
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
  });
});
