// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));
const actions = vi.hoisted(() => ({
  createMcpToken: vi.fn(),
  revokeMcpToken: vi.fn(),
  readAgentConnected: vi.fn(async () => ({ ok: true, data: false })),
}));
vi.mock('@/lib/workspace/actions', () => actions);
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => ({
  reportContributeConnect: vi.fn(),
}));
vi.mock('@/components/workspace/use-onboarded-push', () => ({ useOnboardedPush: () => vi.fn() }));

const { AgentConnect } = await import('./agent-connect');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  actions.createMcpToken.mockResolvedValue({
    ok: true,
    data: { token: 'gr_new', mcpToken: { id: 'T_9', name: 'x', last4: 'new0', createdAt: '', lastUsedAt: null } },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

/** Types into a controlled input the way React hears it. */
function type(input: HTMLInputElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const nameInput = () => container.querySelector<HTMLInputElement>('[data-token-name] input');
const createButton = () =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === 'Create a GitRanks token');

describe('the connect page, naming a token', () => {
  it('suggests the client and the OS, and makes the token with the name the user wrote', async () => {
    await act(async () => root.render(<AgentConnect onboarded tokens={[]} signIn />));
    expect(nameInput()?.value).toMatch(/^Claude Code on /);
    await act(async () => type(nameInput() as HTMLInputElement, 'CI runner'));
    await act(async () => createButton()?.click());
    expect(actions.createMcpToken).toHaveBeenCalledWith('CI runner');
  });

  it('follows the client picked until the user writes a name, and falls back to it when the field is emptied', async () => {
    await act(async () => root.render(<AgentConnect onboarded tokens={[]} />));
    const codex = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Codex CLI');
    await act(async () => codex?.click());
    expect(nameInput()?.value).toMatch(/^Codex CLI on /);
    await act(async () => type(nameInput() as HTMLInputElement, '   '));
    await act(async () => createButton()?.click());
    expect(actions.createMcpToken).toHaveBeenCalledWith(expect.stringMatching(/^Codex CLI on /));
  });
});

describe('"I added it"', () => {
  it('tells the page around the steps, before the agent first calls', async () => {
    const onAdded = vi.fn();
    const onConnected = vi.fn();
    await act(async () =>
      root.render(<AgentConnect embedded onboarded tokens={[]} signIn onAdded={onAdded} onConnected={onConnected} />),
    );
    const added = [...container.querySelectorAll('button')].find((button) => button.textContent === 'I added it');
    await act(async () => added?.click());
    expect(onAdded).toHaveBeenCalledOnce();
    expect(onConnected).not.toHaveBeenCalled();
  });
});
