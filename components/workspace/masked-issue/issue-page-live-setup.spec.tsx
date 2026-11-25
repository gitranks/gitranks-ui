// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const actions = vi.hoisted(() => ({
  lookAtIssue: vi.fn(),
  lookOnReturn: vi.fn(),
  readIssuePage: vi.fn(),
  giveBackIssue: vi.fn(),
  setIssueOutReason: vi.fn(),
  saveIssueOutNote: vi.fn(),
  extendIssueLook: vi.fn(),
  startHeldIssue: vi.fn(),
}));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);
const keptActions = vi.hoisted(() => ({ readIssueKept: vi.fn(async (): Promise<unknown> => null) }));
vi.mock('@/lib/workspace/issue-page-kept.actions', () => keptActions);
const fairUse = vi.hoisted(() => ({ appealFairUse: vi.fn() }));
vi.mock('@/lib/workspace/fair-use.actions', () => fairUse);
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: ({ onAdded, withVsCode }: { onAdded?: () => void; withVsCode?: boolean }) => (
    <div data-agent-connect="" data-vs-code={withVsCode ? '' : undefined}>
      <button type="button" onClick={onAdded}>
        I added it
      </button>
    </div>
  ),
}));
const changes = vi.hoisted(() => ({ useFastChanges: vi.fn(), useChanges: vi.fn() }));
vi.mock('@/lib/workspace/use-changes', () => changes);

const { IssuePageLive } = await import('./issue-page-live');
const { clockOf } = await import('@/lib/workspace/masked-issue');
const { fullPage, issueNumbers, issuePage, MASKED_NOW } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
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
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MASKED_NOW);
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
});

const START = {
  connection: { client: 'claude-code' as const, lastCallAt: '2026-10-28T11:00:00.000Z' },
  agent: { onboarded: true, tokens: [], signIn: true },
  waitingPrs: null,
};

const live = (props: Partial<Parameters<typeof IssuePageLive>[0]> = {}) => {
  const page = (
    <IssuePageLive
      id="q7k2m9xa"
      page={issuePage()}
      from="learn"
      back={{ href: '/learn/issues', label: 'Issues' }}
      numbers={issueNumbers}
      openedAt={MASKED_NOW.toISOString()}
      hosted={false}
      start={START}
      alsoLearn={false}
      returning={false}
      {...props}
    />
  );
  return act(async () => root.render(page));
};
/** Whether the page waits for the agent: the workspace's poll fast, and the attempts asked about. */
const waiting = () =>
  changes.useChanges.mock.lastCall?.[2] === true && changes.useFastChanges.mock.lastCall?.[0] === true;
const state = () => container.querySelector('[data-issue-page]')?.getAttribute('data-issue-page');
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find(
    (each) => each.textContent?.replace('⏎', '').trim() === label,
  ) ?? null;
const press = (label: string) =>
  act(async () => {
    const element = button(label);
    if (!element) throw new Error(`No button "${label}"`);
    element.click();
  });
const notice = () => container.querySelector('[data-page-notice]')?.textContent;

/** A hosted start's answer that refused, with `code`. */
const refusal = (code: string) => ({
  attempt: null,
  started: false,
  refusal: code,
  value: null,
  holder: null,
  until: null,
});
const setupPart = () => container.querySelector('[data-start-setup]');
const startForm = () => container.querySelector('[data-start-form]');
/** The hold after the press without the sign: 30 minutes from it. */
const EXTENDED_UNTIL = '2026-10-28T12:30:00.000Z';
const MARK_KEY = 'gitranks:extended-look';

describe('the page of one issue without the sign the fix needs', () => {
  it('from Contribute: one button and its line in the form’s place, and no wait for the agent', async () => {
    await live({ page: fullPage(), from: 'contribute', setup: 'contribute' });
    expect(setupPart()?.textContent).toContain(
      'First time here? A 2-minute setup shows how Contribute works, then you come back to this issue.',
    );
    expect(setupPart()?.querySelector('h2')?.textContent).toBe('Start fixing it');
    expect(startForm()).toBeNull();
    expect(container.querySelector('[data-agent-connect]')).toBeNull();
    expect(waiting()).toBe(false);
  });

  it('holds the issue longer at the press, then opens Contribute’s setup with the way back to it', async () => {
    const order: string[] = [];
    actions.extendIssueLook.mockImplementation(async () => {
      order.push('extend');
      return { ok: true, data: fullPage({ until: EXTENDED_UNTIL }) };
    });
    router.push.mockImplementation(() => order.push('push'));
    await live({ page: fullPage(), from: 'contribute', setup: 'contribute' });
    await press('Start fixing it');
    expect(actions.extendIssueLook).toHaveBeenCalledWith('q7k2m9xa');
    expect(router.push).toHaveBeenCalledWith('/contribute/start?issue=q7k2m9xa');
    expect(order).toEqual(['extend', 'push']);
    expect(JSON.parse(window.localStorage.getItem(MARK_KEY) ?? 'null')).toEqual({
      id: 'q7k2m9xa',
      until: EXTENDED_UNTIL,
    });
  });

  it('opens the setup even when the hold could not be made longer, and marks nothing', async () => {
    actions.extendIssueLook.mockResolvedValue({ ok: false, error: 'FAILED' });
    await live({ page: fullPage(), from: 'contribute', setup: 'contribute' });
    await press('Start fixing it');
    expect(router.push).toHaveBeenCalledWith('/contribute/start?issue=q7k2m9xa');
    expect(window.localStorage.getItem(MARK_KEY)).toBeNull();
  });

  it('from Learn: Learn’s words, and Learn’s setup with the way back to this page and its view', async () => {
    actions.extendIssueLook.mockResolvedValue({ ok: true, data: fullPage({ until: EXTENDED_UNTIL }) });
    await live({ page: fullPage(), from: 'learn', setup: 'learn', view: 'language=python' });
    expect(setupPart()?.textContent).toContain('A 2-minute setup shows how Learn works');
    await press('Start fixing it');
    expect(router.push).toHaveBeenCalledWith(
      `/learn/setup?back=${encodeURIComponent('/my/issues/q7k2m9xa?from=learn&language=python')}`,
    );
  });

  it('keeps reading open: the masked issue still offers "See the full issue"', async () => {
    await live({ page: issuePage(), from: 'contribute', setup: 'contribute' });
    expect(state()).toBe('MASKED');
    expect(button('See the full issue')).not.toBeNull();
    expect(setupPart()).toBeNull();
  });
});

describe('back on the issue after the setup', () => {
  it('says the real time the hold ends after the copy, and asks for no second extension', async () => {
    window.localStorage.setItem(MARK_KEY, JSON.stringify({ id: 'q7k2m9xa', until: EXTENDED_UNTIL }));
    await live({ page: fullPage({ until: EXTENDED_UNTIL }), from: 'contribute' });
    await press('Copy the prompt');
    expect(writeText).toHaveBeenCalled();
    expect(actions.extendIssueLook).not.toHaveBeenCalled();
    expect(container.querySelector('[data-start-form] [role="status"]')?.textContent).toBe(
      `Copied. Waiting for Claude Code. The issue is held until ${clockOf(EXTENDED_UNTIL)}.`,
    );
    expect(waiting()).toBe(true);
  });

  it('a mark for another issue changes nothing: the copy holds this one 30 minutes', async () => {
    window.localStorage.setItem(MARK_KEY, JSON.stringify({ id: 'other123', until: EXTENDED_UNTIL }));
    actions.extendIssueLook.mockResolvedValue({ ok: true, data: fullPage({ until: EXTENDED_UNTIL }) });
    await live({ page: fullPage(), from: 'contribute' });
    await press('Copy the prompt');
    expect(actions.extendIssueLook).toHaveBeenCalledWith('q7k2m9xa');
    expect(container.querySelector('[data-start-form] [role="status"]')?.textContent).toContain(
      'The issue is now held for 30 minutes.',
    );
  });
});

describe('a start the server refuses because the setup is not finished', () => {
  it('shows the same button and line in the form’s place, and no notice', async () => {
    actions.startHeldIssue.mockResolvedValue({ ok: true, data: refusal('SETUP_UNFINISHED') });
    await live({ page: fullPage(), from: 'contribute', hosted: true, start: { ...START, connection: null } });
    await press('Start with the hosted agent');
    expect(startForm()).toBeNull();
    expect(setupPart()?.textContent).toContain('A 2-minute setup shows how Contribute works');
    expect(notice()).toBeUndefined();
    expect(waiting()).toBe(false);
  });
});

describe('the start form by the signs', () => {
  it('from Learn without the Contribute sign: no "Just fix it"', async () => {
    await live({ page: fullPage(), from: 'learn', justFix: false });
    expect(container.textContent).not.toContain('Just fix it');
    expect(container.querySelector('[data-prompt]')?.textContent).toContain('with GitRanks Learn and teach me');
  });

  it('from Contribute: the walkthrough line by the Learn sign, not by the use of Learn', async () => {
    await live({ page: fullPage(), from: 'contribute', alsoLearn: true, walkthrough: false });
    expect(container.querySelector('[data-walkthrough-line]')).toBeNull();
    await live({ page: fullPage(), from: 'contribute', alsoLearn: false, walkthrough: true });
    expect(container.querySelector('[data-walkthrough-line]')?.textContent).toContain('You also use GitRanks Learn.');
  });
});
