// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { McpClient } from '@/lib/workspace/mcp-setup';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }) }));
const actions = vi.hoisted(() => ({ readStartPageIssue: vi.fn(), readStartPageAttempt: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => actions);
const workspace = vi.hoisted(() => ({ resumeContributing: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => workspace);
const tracker = vi.hoisted(() => ({ reportLearnEvent: vi.fn(), reportContributeConnect: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);
// Step 1's connect steps, as a button that says the agent has called.
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: ({
    onConnected,
    embedded,
    connectSource,
  }: {
    onConnected: (client: McpClient) => void;
    embedded?: boolean;
    connectSource: string;
  }) => (
    <button
      type="button"
      data-fake-connect={`${embedded ? 'embedded' : 'page'}:${connectSource}`}
      onClick={() => onConnected('codex')}
    >
      Agent called
    </button>
  ),
}));

const { StartPageBody } = await import('./start-page-body');
const { clearChangesWake, emitContributeChanges, fastChangesHeld, setChangesWake } = await import(
  '@/lib/workspace/changes-bus'
);
const { START_FALLBACK_ASK_MS, START_WAIT_FOR_MS } = await import('@/lib/workspace/start/start-watch');
const { fixAttemptOf, lessonAttempt, START_REF, startPageViewOf, startViews } = await import(
  '@/lib/workspace/start/__fixtures__/start-page'
);

import type { StartMode, StartPageView } from '@/lib/workspace/start/start-page.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
/** The workspace's poll, as the tabs run it: present unless a test takes it away. */
const pollReadNow = () => {};

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  actions.readStartPageAttempt.mockResolvedValue({ ok: true, data: null });
  actions.readStartPageIssue.mockResolvedValue({ ok: true, data: startViews.open });
  workspace.resumeContributing.mockResolvedValue({ ok: true, data: true });
  setChangesWake(pollReadNow);
});

afterEach(() => {
  clearChangesWake(pollReadNow);
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const mount = (
  mode: StartMode,
  view: StartPageView | null = startPageViewOf(),
  extra: { locked?: boolean; onLeave?: () => void } = {},
) =>
  render(
    <StartPageBody
      issueRef={START_REF}
      mode={mode}
      view={view}
      backHref="/contribute#issues"
      backLabel="Issues for you"
      frame="tabs"
      {...extra}
    />,
  );
const stage = () => container.querySelector('[data-start-page]')?.getAttribute('data-start-page');
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
/** One poll that names what moved. */
const poll = (...areas: Parameters<typeof emitContributeChanges>[0]) =>
  act(async () => {
    emitContributeChanges(areas);
    await vi.advanceTimersByTimeAsync(0);
  });
const click = async (selector: string) => {
  const button = container.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`No ${selector}`);
  await act(async () => button.click());
};
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === label) ?? null;
const press = async (label: string) => {
  const found = button(label);
  if (!found) throw new Error(`No ${label}`);
  await act(async () => found.click());
};

describe('the Start page, waiting for the agent', () => {
  it('counts the page shown once per mode, holds the poll fast while it waits, and asks on each change of attempts', async () => {
    await mount('fix');
    expect(tracker.reportLearnEvent).toHaveBeenCalledTimes(1);
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_view',
      event: 'contribute_start_view',
      source: 'contribute_start',
    });
    expect(stage()).toBe('waiting');
    expect(fastChangesHeld()).toBe(true);
    // No timer of its own.
    await wait(60_000);
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
    await poll('FEED', 'SETTINGS');
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).toHaveBeenCalledWith(START_REF.repo, START_REF.issue);
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(1);
  });

  it('asks once when the page is shown again', async () => {
    await mount('fix');
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['fix', fixAttemptOf('RUNNING'), '/my/pull-requests/driftwood-js/driftwood/934', 'contribute_start'],
    ['fix', lessonAttempt, '/my/pull-requests/driftwood-js/driftwood/934', 'contribute_start'],
    ['lesson', lessonAttempt, '/my/pull-requests/driftwood-js/driftwood/934', 'learn_start'],
  ] as const)('in %s mode, a claim (%j) opens its pull request’s page, once', async (mode, attempt, href, source) => {
    actions.readStartPageAttempt.mockResolvedValue({ ok: true, data: attempt });
    await mount(mode);
    await poll('ATTEMPTS');
    expect(replace).toHaveBeenCalledWith(href);
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_view',
      event: source === 'learn_start' ? 'learn_start_claimed' : 'contribute_start_claimed',
      source,
    });
    await poll('ATTEMPTS');
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('tells the page it leaves once, as it moves on to the pull request’s page (a flow forgets its step)', async () => {
    const onLeave = vi.fn();
    actions.readStartPageAttempt.mockResolvedValue({ ok: true, data: lessonAttempt });
    await mount('lesson', startPageViewOf(), { onLeave });
    await poll('ATTEMPTS');
    await poll('ATTEMPTS');
    expect(onLeave).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledOnce();
  });

  it('in lesson mode, words a Fix claim while it lives, and drops the words once it is released', async () => {
    actions.readStartPageAttempt.mockResolvedValueOnce({ ok: true, data: fixAttemptOf('RUNNING') });
    await mount('lesson');
    await poll('ATTEMPTS');
    expect(replace).not.toHaveBeenCalled();
    expect(stage()).toBe('fix');
    expect(container.textContent).toContain(
      'Your agent took it as a regular fix, without a lesson. Ask your agent to release it, then paste the prompt again.',
    );
    expect(container.querySelector('a[href="/my/pull-requests/driftwood-js/driftwood/934"]')?.textContent).toBe(
      'Open it →',
    );
    await poll('ATTEMPTS');
    expect(stage()).toBe('waiting');
  });

  it('in lesson mode, stops waiting once the agent opened a regular pull request for the issue', async () => {
    actions.readStartPageAttempt.mockResolvedValue({ ok: true, data: fixAttemptOf('PR_OPEN') });
    await mount('lesson');
    await poll('ATTEMPTS');
    expect(container.textContent).toContain('Pick another issue →');
    expect(fastChangesHeld()).toBe(false);
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(1);
  });

  it('waits for nothing before the agent has called; its first call asks the issue again in the mode', async () => {
    await mount('fix', startPageViewOf({ connection: null }));
    expect(stage()).toBe('connect');
    expect(fastChangesHeld()).toBe(false);
    expect(container.querySelector('[data-fake-connect="embedded:contribute_start"]')).not.toBeNull();
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();

    await click('[data-fake-connect]');
    expect(actions.readStartPageIssue).toHaveBeenCalledWith(START_REF.repo, START_REF.issue, 'fix');
    expect(stage()).toBe('waiting');
    expect(container.textContent).toContain('Codex CLI is connected. Its last call was a moment ago.');
    expect(container.textContent).toContain('2 · Paste this in Codex CLI');
  });

  it('connects in lesson mode as Learn’s start page did, and opens the lesson the second ask names', async () => {
    actions.readStartPageIssue.mockResolvedValueOnce({ ok: true, data: startViews.yoursLesson });
    await mount('lesson', startPageViewOf({ connection: null }));
    expect(container.querySelector('[data-fake-connect="embedded:learn_start"]')).not.toBeNull();
    await click('[data-fake-connect]');
    expect(actions.readStartPageIssue).toHaveBeenCalledWith(START_REF.repo, START_REF.issue, 'lesson');
    expect(replace).toHaveBeenCalledWith('/my/pull-requests/driftwood-js/driftwood/934');
  });

  it('shows a refusal the second ask answers, and waits for nothing', async () => {
    actions.readStartPageIssue.mockResolvedValueOnce({ ok: true, data: startViews.taken });
    await mount('fix', startPageViewOf({ connection: null }));
    await click('[data-fake-connect]');
    expect(stage()).toBe('refused');
    expect(container.textContent).toContain("Someone else's agent took this issue.");
    expect(fastChangesHeld()).toBe(false);
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
  });

  it('after 30 minutes shown says so and lets the poll slow down; Check again asks the issue and waits anew', async () => {
    await mount('fix');
    await wait(START_WAIT_FOR_MS);
    expect(stage()).toBe('timeout');
    expect(container.textContent).toContain(
      'Nothing from your agent yet. Check that it is connected, or paste the prompt again.',
    );
    expect(fastChangesHeld()).toBe(false);
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();

    await press('Check again');
    expect(actions.readStartPageIssue).toHaveBeenCalledWith(START_REF.repo, START_REF.issue, 'fix');
    expect(stage()).toBe('waiting');
    expect(fastChangesHeld()).toBe(true);
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(1);
    // A new 30 minutes.
    await wait(START_WAIT_FOR_MS - 1);
    expect(stage()).toBe('waiting');
    await wait(1);
    expect(stage()).toBe('timeout');
  });

  it('keeps the page when Check again fails, and waits anew', async () => {
    await mount('fix');
    await wait(START_WAIT_FOR_MS);
    actions.readStartPageIssue.mockRejectedValueOnce(new Error('offline'));
    await press('Check again');
    expect(stage()).toBe('waiting');
    expect(container.textContent).toContain('Fix this issue');
  });

  it('resumes a pause the person set, then asks the issue again', async () => {
    actions.readStartPageIssue.mockResolvedValueOnce({ ok: true, data: startViews.open });
    await mount('fix', startPageViewOf({ issue: startViews.pausedByYou }));
    expect(stage()).toBe('refused');
    await press('Resume');
    expect(workspace.resumeContributing).toHaveBeenCalledTimes(1);
    expect(actions.readStartPageIssue).toHaveBeenCalledTimes(1);
    expect(stage()).toBe('waiting');
  });

  it('asks every 10 seconds by itself in a tab where no poll runs, within the same 30 minutes', async () => {
    clearChangesWake(pollReadNow);
    actions.readStartPageAttempt.mockResolvedValueOnce({ ok: true, data: null });
    actions.readStartPageAttempt.mockResolvedValue({ ok: true, data: fixAttemptOf('RUNNING') });
    await mount('fix');
    await wait(START_FALLBACK_ASK_MS - 1);
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
    await wait(1);
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    await wait(START_FALLBACK_ASK_MS);
    expect(replace).toHaveBeenCalledWith('/my/pull-requests/driftwood-js/driftwood/934');
  });

  it('asks nothing by itself while the poll runs, and nothing after the 30 minutes without one', async () => {
    await mount('fix');
    await wait(START_FALLBACK_ASK_MS * 3);
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();

    act(() => root.unmount());
    root = createRoot(container);
    clearChangesWake(pollReadNow);
    await mount('fix');
    await wait(START_WAIT_FOR_MS);
    expect(stage()).toBe('timeout');
    const asked = actions.readStartPageAttempt.mock.calls.length;
    await wait(START_FALLBACK_ASK_MS * 3);
    expect(actions.readStartPageAttempt).toHaveBeenCalledTimes(asked);
  });

  it.each([
    ['attempts at a time', startViews.limitAttempts],
    ['open pull requests', startViews.limitPrs],
    ['a lesson in progress', startViews.ownInProgress],
  ] as const)(
    'asks the issue again on each change of attempts under a limit on %s, and the steps come back',
    async (_name, refused) => {
      actions.readStartPageIssue.mockResolvedValueOnce({ ok: true, data: refused });
      actions.readStartPageIssue.mockResolvedValueOnce({ ok: true, data: startViews.open });
      await mount('lesson', startPageViewOf({ issue: refused }));
      expect(stage()).toBe('refused');
      await poll('FEED');
      expect(actions.readStartPageIssue).not.toHaveBeenCalled();
      await poll('ATTEMPTS');
      expect(actions.readStartPageIssue).toHaveBeenCalledTimes(1);
      expect(stage()).toBe('refused');
      await poll('ATTEMPTS');
      expect(actions.readStartPageIssue).toHaveBeenCalledTimes(2);
      expect(stage()).toBe('waiting');
    },
  );

  it('does not ask the issue again under a refusal no attempt of the viewer clears', async () => {
    await mount('fix', startPageViewOf({ issue: startViews.taken }));
    await poll('ATTEMPTS');
    expect(actions.readStartPageIssue).not.toHaveBeenCalled();
  });

  it('says why Resume failed, and keeps the refusal', async () => {
    workspace.resumeContributing.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await mount('fix', startPageViewOf({ issue: startViews.pausedByYou }));
    await press('Resume');
    expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
    expect(actions.readStartPageIssue).not.toHaveBeenCalled();
    expect(stage()).toBe('refused');
    workspace.resumeContributing.mockRejectedValueOnce(new Error('offline'));
    await press('Resume');
    expect(container.querySelector('[role="alert"]')?.textContent).toBeTruthy();
    // A Resume that goes through clears it.
    await press('Resume');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('lets the poll go once the page is gone', async () => {
    await mount('fix');
    expect(fastChangesHeld()).toBe(true);
    act(() => root.unmount());
    root = createRoot(container);
    expect(fastChangesHeld()).toBe(false);
    await poll('ATTEMPTS');
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
  });
});

describe('the Start page with nothing read, or locked', () => {
  it.each([
    ['no read', null, false],
    ['locked', startPageViewOf({ connection: null }), true],
  ] as const)('%s: draws the page and asks nothing', async (_name, view, locked) => {
    await mount('lesson', view, { locked });
    expect(container.textContent).toContain('Fix this issue and learn from it');
    expect(tracker.reportLearnEvent).not.toHaveBeenCalled();
    expect(fastChangesHeld()).toBe(false);
    expect(container.querySelector('[data-fake-connect]')).toBeNull();
    await poll('ATTEMPTS');
    await wait(START_WAIT_FOR_MS * 2);
    expect(actions.readStartPageAttempt).not.toHaveBeenCalled();
    expect(actions.readStartPageIssue).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
