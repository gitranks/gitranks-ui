// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const actions = vi.hoisted(() => ({
  createMcpToken: vi.fn(),
  revokeMcpToken: vi.fn(),
  readAgentConnected: vi.fn(async (_watch?: { onboarded?: boolean }) => ({ ok: true, data: false })),
}));
vi.mock('@/lib/workspace/actions', () => actions);
const tracker = vi.hoisted(() => ({ reportContributeConnect: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);
const auth = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => auth);

const { BuildStartLive } = await import('./build-start-live');
const { AGENT_POLL_MS } = await import('@/lib/workspace/agent-connect');
const { BUILD_START_LATE_MS } = await import('@/lib/build/start');
const { startConnected, startFresh, startProject, startProjects, startStarted } = await import(
  '@/lib/build/__fixtures__/start'
);
type BuildStart = import('@/lib/build/types').BuildStart;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
/** What each read of the flow's state answers, in turn; the last one again once they run out. */
let answers: (BuildStart | null)[];
/** The status of each read; 200 unless a spec says otherwise. */
let status = 200;
const fetchMock = vi.fn(async (_url: string) => {
  const start = answers.length > 1 ? answers.shift() : answers[0];
  return new Response(JSON.stringify({ start: start ?? null }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  answers = [startFresh];
  status = 200;
  actions.readAgentConnected.mockResolvedValue({ ok: true, data: false });
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const draw = async (props: Partial<Parameters<typeof BuildStartLive>[0]> = {}) => {
  await act(async () =>
    root.render(
      <BuildStartLive
        signedIn
        start={startFresh}
        project={startProject}
        projects={startProjects}
        openedAt="2026-11-26T12:00:00.000Z"
        {...props}
      />,
    ),
  );
};

/** Lets the page read its state again (and the connect steps ask about the agent). */
const wait = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const stepsOf = () =>
  [...container.querySelectorAll('[data-flow-steps] li')].map((step) => step.getAttribute('data-step-state'));
const projectCard = () => container.querySelector('[data-build-start-project]');
const press = async (name: string) => {
  const button = [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === name);
  if (!button) throw new Error(`no button "${name}"`);
  await act(async () => button.click());
};

describe('the start flow, live', () => {
  it('moves on by itself: step 2 opens when the agent calls, then says the build has started', async () => {
    answers = [startFresh, startConnected, startStarted];
    await draw();
    expect(stepsOf()).toEqual(['current', 'next']);
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('locked');

    await wait(AGENT_POLL_MS);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/build/start?project=mcp-server', { cache: 'no-store' });
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('locked');

    await wait(AGENT_POLL_MS);
    expect(stepsOf()).toEqual(['done', 'current']);
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('say');
    expect(container.querySelector('pre')?.textContent).toBe('Teach me how to build an MCP server with GitRanks');
    expect(document.activeElement).toBe(projectCard()?.querySelector('h2'));
    expect(container.querySelector('[data-build-start-agent="connected"] h2')?.textContent).toBe(
      'Your agent is connected',
    );

    await wait(AGENT_POLL_MS);
    expect(stepsOf()).toEqual(['done', 'done']);
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('started');
    expect(projectCard()?.querySelector('a')?.getAttribute('href')).toBe('/build/mcp-server');

    // Started: nothing more is asked.
    const asked = fetchMock.mock.calls.length;
    await wait(AGENT_POLL_MS * 3);
    expect(fetchMock.mock.calls.length).toBe(asked);
  });

  it('lands someone whose agent is already connected on step 2, and lets them pick a project', async () => {
    answers = [startConnected];
    await draw({ start: startConnected, project: null });
    expect(stepsOf()).toEqual(['done', 'current']);
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('pick');
    expect(container.querySelector('[data-build-start-agent="setup"]')).toBeNull();

    const row = container.querySelector<HTMLButtonElement>('[data-build-start-row="coding-agent"]');
    await act(async () => row?.click());
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('say');
    expect(container.querySelector('pre')?.textContent).toBe('Teach me how to build a coding agent with GitRanks');
    await wait(AGENT_POLL_MS);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/build/start?project=coding-agent', { cache: 'no-store' });

    await press('Pick another project');
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('pick');
    await wait(AGENT_POLL_MS);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/build/start', { cache: 'no-store' });
  });

  it('names the agent picked once it calls, and says so after 10 minutes without a call', async () => {
    await draw();
    await press('Codex CLI');
    await press('I added it');
    expect(actions.readAgentConnected).toHaveBeenCalledWith({
      tokenId: null,
      onboarded: true,
      since: '2026-11-26T12:00:00.000Z',
    });
    expect(container.textContent).toContain('Waiting for Codex CLI to call GitRanks…');
    expect(container.querySelector('[data-agent-late]')).toBeNull();

    await wait(BUILD_START_LATE_MS);
    expect(container.querySelector('[data-agent-late]')?.textContent).toMatch(
      /^Codex CLI has not called GitRanks after 10 minutes\. Check that it is running\. /,
    );
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('locked');

    actions.readAgentConnected.mockResolvedValue({ ok: true, data: true });
    await wait(AGENT_POLL_MS);
    expect(container.querySelector('[data-build-start-agent="connected"] h2')?.textContent).toBe(
      'Codex CLI is connected',
    );
    expect(projectCard()?.textContent).toContain('Say this in Codex CLI.');
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    // Build's connect is not counted in Contribute's numbers, and leaves Contribute's stored click alone.
    expect(tracker.reportContributeConnect).not.toHaveBeenCalled();
  });

  it("never takes Contribute's onboarded stamp for a call: onboarded with a Claude key, no agent, step 2 stays locked", async () => {
    // Asked about the stamp (`onboarded: false`), the API would say yes; asked about a sign-in since the page opened, no.
    actions.readAgentConnected.mockImplementation(async (watch?: { onboarded?: boolean }) => ({
      ok: true,
      data: watch?.onboarded === false,
    }));
    await draw();
    await press('I added it');
    await wait(AGENT_POLL_MS * 3);
    expect(actions.readAgentConnected).toHaveBeenCalled();
    for (const [watch] of actions.readAgentConnected.mock.calls as unknown as [{ onboarded: boolean }][]) {
      expect(watch.onboarded).toBe(true);
    }
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('locked');
    expect(container.querySelector('[data-build-start-agent="connected"]')).toBeNull();
    expect(container.textContent).toContain('Waiting for Claude Code to call GitRanks…');
  });

  it('stops asking and says so in one line when a read answers nothing (signed out since, or a failure)', async () => {
    answers = [startFresh, null];
    await draw();
    await wait(AGENT_POLL_MS);
    expect(container.querySelector('[data-build-start-lost]')).toBeNull();
    await wait(AGENT_POLL_MS);
    expect(container.querySelector('[data-build-start-lost]')?.textContent).toBe(
      'This page stopped checking: we could not read where you stand. Reload it to check again.',
    );
    const asked = fetchMock.mock.calls.length;
    await wait(AGENT_POLL_MS * 3);
    expect(fetchMock.mock.calls.length).toBe(asked);
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('locked');
  });

  it('stops asking on a read that fails outright too', async () => {
    status = 500;
    await draw({ start: startConnected });
    await wait(AGENT_POLL_MS);
    expect(container.querySelector('[data-build-start-lost]')).not.toBeNull();
    expect(projectCard()?.getAttribute('data-build-start-project')).toBe('say');
    const asked = fetchMock.mock.calls.length;
    await wait(AGENT_POLL_MS * 3);
    expect(fetchMock.mock.calls.length).toBe(asked);
  });

  it('opens the setup again for another agent, under the connected line', async () => {
    await draw({ start: startConnected });
    await press('Connect another agent');
    expect(container.querySelector('[data-build-start-agent="connected"] fieldset')).not.toBeNull();
    await press('Connect another agent');
    expect(container.querySelector('[data-build-start-agent="connected"] fieldset')).toBeNull();
  });

  it('asks nothing while the page is hidden', async () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    await draw();
    await wait(AGENT_POLL_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a visitor to sign in first, back to this very address, and reads nothing for them', async () => {
    window.history.replaceState(null, '', '/build/start?project=mcp-server');
    await draw({ signedIn: false, start: null });
    expect(container.querySelector('[data-build-start-agent="sign-in"]')).not.toBeNull();
    await press('Sign in with GitHub');
    expect(auth.signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/build/start?project=mcp-server' });
    await wait(AGENT_POLL_MS * 2);
    expect(fetchMock).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '/');
  });
});
