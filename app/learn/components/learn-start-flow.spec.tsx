// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { McpClient } from '@/lib/workspace/mcp-setup';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }) }));
const actions = vi.hoisted(() => ({ readLearnStartIssue: vi.fn(), readLearnStartAttempt: vi.fn() }));
vi.mock('@/lib/learn/start.actions', () => actions);
const tracker = vi.hoisted(() => ({ reportLearnEvent: vi.fn(), reportContributeConnect: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);
// Step 1's connect steps, as a button that says the agent has called.
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: ({ onConnected, mode }: { onConnected: (client: McpClient) => void; mode: string }) => (
    <button type="button" data-fake-connect={mode} onClick={() => onConnected('codex')}>
      Agent called
    </button>
  ),
}));

const { LearnStart } = await import('./learn-start-screen');
const { fixAttemptOf, START_GOAL, START_NUMBER, START_REPO, startConnection, startViews } = await import(
  '@/lib/learn/__fixtures__/learn-start'
);
const { LEARN_START_POLL_FOR_MS, LEARN_START_POLL_MS } = await import('@/lib/learn/learn-start');

import type { LearnStartConnection } from '@/lib/learn/learn-start';
import type { LearnStartView } from '@/lib/learn/learn-start.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  actions.readLearnStartAttempt.mockResolvedValue({ ok: true, data: null });
  actions.readLearnStartIssue.mockResolvedValue({ ok: true, data: startViews.open });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const mount = async (
  initial: LearnStartView = startViews.open,
  connection: LearnStartConnection | null = startConnection,
) => {
  await act(async () =>
    root.render(
      <LearnStart
        repo={START_REPO}
        number={START_NUMBER}
        goal={START_GOAL}
        initial={initial}
        connection={connection}
        onboarded
        tokens={[]}
        signIn={false}
        openedAt="2026-10-28T12:00:00.000Z"
      />,
    ),
  );
};
const stage = () => container.querySelector('[data-learn-start]')?.getAttribute('data-learn-start');
const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
const click = async (selector: string) => {
  const button = container.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`No ${selector}`);
  await act(async () => button.click());
};
const checkAgain = () =>
  click('[data-learn-start-step="lesson"] button').catch(() => {
    throw new Error('No Check again');
  });

describe('the start page at work', () => {
  it('counts the page shown once, and asks at once and every 5 seconds while connected', async () => {
    await mount();
    expect(tracker.reportLearnEvent).toHaveBeenCalledTimes(1);
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_view',
      event: 'learn_start_view',
      source: 'learn_start',
    });
    expect(actions.readLearnStartAttempt).toHaveBeenCalledWith(START_REPO, START_NUMBER);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(1);
    await wait(LEARN_START_POLL_MS);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(2);
    expect(stage()).toBe('waiting');
  });

  it('goes on to the lesson page once the agent takes the issue as a lesson, counted once', async () => {
    actions.readLearnStartAttempt.mockResolvedValueOnce({ ok: true, data: null });
    actions.readLearnStartAttempt.mockResolvedValue({ ok: true, data: { id: 'A_7', mode: 'LEARN', state: 'RUNNING' } });
    await mount();
    await wait(LEARN_START_POLL_MS);
    expect(replace).toHaveBeenCalledWith('/learn/attempts/A_7');
    expect(tracker.reportLearnEvent).toHaveBeenCalledWith({
      kind: 'learn_view',
      event: 'learn_start_claimed',
      source: 'learn_start',
    });
    await wait(LEARN_START_POLL_MS * 3);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('words a Fix attempt while it lives, and drops the words once it is released', async () => {
    actions.readLearnStartAttempt.mockResolvedValueOnce({ ok: true, data: fixAttemptOf('RUNNING') });
    await mount();
    await wait(0);
    expect(stage()).toBe('fix');
    expect(container.textContent).toContain('Ask your agent to release it, then paste the prompt again.');
    await wait(LEARN_START_POLL_MS);
    expect(stage()).toBe('waiting');
  });

  it('stops asking once the agent opened a regular pull request for the issue', async () => {
    actions.readLearnStartAttempt.mockResolvedValue({ ok: true, data: fixAttemptOf('PR_OPEN') });
    await mount();
    expect(container.textContent).toContain('Pick another issue');
    await wait(LEARN_START_POLL_MS * 4);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(1);
  });

  it('asks nothing before the agent has called; its first call asks the issue again and opens steps 2 and 3', async () => {
    await mount(startViews.open, null);
    expect(stage()).toBe('connect');
    expect(container.querySelector('[data-fake-connect="learn"]')).not.toBeNull();
    await wait(LEARN_START_POLL_MS * 3);
    expect(actions.readLearnStartAttempt).not.toHaveBeenCalled();

    await click('[data-fake-connect]');
    expect(actions.readLearnStartIssue).toHaveBeenCalledWith(START_REPO, START_NUMBER);
    expect(stage()).toBe('waiting');
    expect(container.textContent).toContain('Codex CLI is connected. Its last call was a moment ago.');
    expect(container.textContent).toContain('2 · Paste this in Codex CLI');
    expect(actions.readLearnStartAttempt).toHaveBeenCalled();
  });

  it('shows a refusal the second ask answers, and waits for nothing', async () => {
    actions.readLearnStartIssue.mockResolvedValueOnce({ ok: true, data: startViews.taken });
    await mount(startViews.open, null);
    await click('[data-fake-connect]');
    expect(stage()).toBe('refused');
    expect(container.textContent).toContain("Someone else's agent took this issue.");
    const asked = actions.readLearnStartAttempt.mock.calls.length;
    await wait(LEARN_START_POLL_MS * 4);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(asked);
  });

  it("goes on to the viewer's Learn attempt the second ask names", async () => {
    actions.readLearnStartIssue.mockResolvedValueOnce({ ok: true, data: startViews.yoursLesson });
    await mount(startViews.open, null);
    await click('[data-fake-connect]');
    expect(replace).toHaveBeenCalledWith('/learn/attempts/A_7');
  });

  it('after 30 minutes says so, and Check again asks the issue again and waits anew', async () => {
    await mount();
    await wait(LEARN_START_POLL_FOR_MS + LEARN_START_POLL_MS);
    expect(stage()).toBe('timeout');
    const asked = actions.readLearnStartAttempt.mock.calls.length;
    await wait(LEARN_START_POLL_MS * 4);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(asked);

    await checkAgain();
    expect(actions.readLearnStartIssue).toHaveBeenCalledTimes(1);
    expect(stage()).toBe('waiting');
    await wait(LEARN_START_POLL_MS);
    expect(actions.readLearnStartAttempt.mock.calls.length).toBeGreaterThan(asked);
  });

  it('ends the wait with Check again when the session ended, and keeps the page when the re-ask fails', async () => {
    actions.readLearnStartAttempt.mockResolvedValue({ ok: false, error: 'SIGNED_OUT' });
    await mount();
    expect(stage()).toBe('timeout');
    actions.readLearnStartIssue.mockRejectedValueOnce(new Error('offline'));
    await checkAgain();
    expect(container.textContent).toContain('Start your own lesson');
  });

  it('goes on asking after a failed read', async () => {
    actions.readLearnStartAttempt.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await mount();
    await wait(LEARN_START_POLL_MS);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(2);
    expect(stage()).toBe('waiting');
  });

  it('stops asking once the page is gone', async () => {
    await mount();
    act(() => root.unmount());
    root = createRoot(container);
    await wait(LEARN_START_POLL_MS * 4);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(1);
  });

  it("words the viewer's Fix attempt from the first answer, and keeps asking before the agent is connected here", async () => {
    actions.readLearnStartAttempt.mockResolvedValue({ ok: true, data: fixAttemptOf('CHECKS') });
    await mount(startViews.yoursFix, null);
    expect(stage()).toBe('fix');
    expect(container.textContent).toContain('Wait for its checks');
    await wait(LEARN_START_POLL_MS);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(2);

    // Released: nothing to wait for until the agent has called.
    actions.readLearnStartAttempt.mockResolvedValue({ ok: true, data: null });
    await wait(LEARN_START_POLL_MS);
    expect(stage()).toBe('connect');
    await wait(LEARN_START_POLL_MS * 3);
    expect(actions.readLearnStartAttempt).toHaveBeenCalledTimes(3);
  });
});
