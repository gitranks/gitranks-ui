// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const actions = vi.hoisted(() => ({
  createMcpToken: vi.fn(),
  revokeMcpToken: vi.fn(),
  readAgentConnected: vi.fn(async () => ({ ok: true, data: true })),
}));
vi.mock('@/lib/workspace/actions', () => actions);
const tracker = vi.hoisted(() => ({ reportContributeConnect: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => tracker);

const { OwnAgentStep } = await import('./own-agent-step');
const { AgentConnect } = await import('@/components/workspace/agent/agent-connect');
const { mcpToken } = await import('@/lib/contribute/__fixtures__/contribute-views');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

/** A person back mid-setup: the token their agent has not called with yet is what the page watches. */
const WAITING = [mcpToken({ id: 'T_9' })];

describe('the own agent’s first call', () => {
  it('on the flow’s step: counts the connect, then goes on to the first issue, the layout read again', async () => {
    await act(async () =>
      root.render(<OwnAgentStep tokens={WAITING} signIn={false} learnOpen={false} openedAt="2026-11-20T00:00:00Z" />),
    );
    expect(actions.readAgentConnected).toHaveBeenCalledWith({ tokenId: 'T_9', onboarded: false, since: null });
    expect(tracker.reportContributeConnect).toHaveBeenCalledWith('agent', undefined);
    expect(router.replace).toHaveBeenCalledWith('/contribute/start/issue');
    expect(router.refresh).toHaveBeenCalled();
  });

  it('on the Agent tab’s connect page, a first connect goes on to the first issue too', async () => {
    await act(async () => root.render(<AgentConnect onboarded={false} tokens={WAITING} />));
    expect(tracker.reportContributeConnect).toHaveBeenCalledWith('agent', undefined);
    expect(router.replace).toHaveBeenCalledWith('/contribute/start/issue');
  });

  it('for an account already in the workspace, the connect page stays', async () => {
    await act(async () => root.render(<AgentConnect onboarded tokens={[mcpToken({ id: 'T_9' })]} />));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
