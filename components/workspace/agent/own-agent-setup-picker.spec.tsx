// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/actions', () => ({}));

const { SetupLines } = await import('./own-agent-section');

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

const pick = (name: string) => {
  const button = [...container.querySelectorAll('button')].find((each) => each.textContent === name);
  if (!button) throw new Error(`No ${name} button`);
  act(() => button.click());
};

describe('Set up your agent, VS Code', () => {
  it('signing in: the one-click install, the mcp.json lines by hand, and the token setup in the fold', () => {
    act(() => root.render(<SetupLines signIn />));
    pick('VS Code');

    expect(container.querySelector('[data-setup]')?.getAttribute('data-setup')).toBe('vs-code');
    const install = container.querySelector<HTMLAnchorElement>('[data-install-link]');
    expect(install?.textContent).toContain('Add to VS Code');
    expect(install?.href).toContain('https://vscode.dev/redirect/mcp/install');
    expect(install?.className).toContain('min-h-11');
    expect(container.textContent).toContain('Or by hand: Add this with MCP: Open User Configuration');
    expect(container.textContent).toContain('mcp.json');
    expect(container.querySelector('[data-token-fold]')?.textContent).toContain('~/.copilot/mcp-config.json');
    expect(container.querySelector('[data-token-fold]')?.textContent).toContain('GITRANKS_MCP_TOKEN');
  });

  it('with tokens alone: the token setup, no install link', () => {
    act(() => root.render(<SetupLines />));
    pick('VS Code');

    expect(container.querySelector('[data-install-link]')).toBeNull();
    expect(container.textContent).toContain("Add this to Copilot's MCP file");
    expect(container.textContent).toContain('~/.copilot/mcp-config.json');
    expect(container.textContent).toContain(`Bearer \${GITRANKS_MCP_TOKEN}`);
  });
});
