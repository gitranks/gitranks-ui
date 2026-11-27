// @vitest-environment jsdom
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/actions', () => ({
  createMcpToken: vi.fn(),
  revokeMcpToken: vi.fn(),
  readAgentConnected: vi.fn(),
}));

const { BuildStartScreen } = await import('./build-start-screen');
const { AgentConnectView } = await import('@/components/workspace/agent/agent-connect');
const { BUILD_AGENT_VARIANT } = await import('@/lib/build/start');
const { startedBuild, startProject, startProjects } = await import('@/lib/build/__fixtures__/start');
const { codingAgentCard } = await import('@/lib/build/__fixtures__/projects');
const { MCP_CLIENTS_WITH_VS_CODE } = await import('@/lib/workspace/mcp-setup');

type Props = Parameters<typeof BuildStartScreen>[0];
const noop = () => {};

/** Step 1's connect steps as the page embeds them: Claude Code picked, the setup shown, unless `props` says otherwise. */
const connect = (props: Partial<Parameters<typeof AgentConnectView>[0]> = {}) => (
  <AgentConnectView
    embedded
    signIn
    keyLink={false}
    variant={BUILD_AGENT_VARIANT}
    client="claude-code"
    onClient={noop}
    stage="none"
    shown={null}
    os="mac"
    detectedOs="mac"
    onOs={noop}
    onCreate={noop}
    onAdded={noop}
    onReopen={noop}
    onReplace={noop}
    clients={MCP_CLIENTS_WITH_VS_CODE}
    {...props}
  />
);

const screen = (props: Partial<Props>) => {
  const html = renderToStaticMarkup(
    (
      <BuildStartScreen
        stage="agent"
        connect={connect()}
        agent={null}
        project={{ kind: 'pick', projects: startProjects }}
        build={null}
        {...props}
      />
    ) as ReactElement,
  );
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
};

const textOf = (host: Element, selector: string) =>
  [...host.querySelectorAll(selector)].map((node) => node.textContent?.replace(/\s+/g, ' ').trim());

const stepsOf = (host: Element) =>
  [...host.querySelectorAll('[data-flow-steps] li')].map((step) => step.getAttribute('data-step-state'));

describe("the start flow's screens", () => {
  it('setup: step 1 asks which agent and shows its line to paste; step 2 waits, locked', () => {
    const host = screen({ stage: 'agent' });
    expect(host.querySelector('h1')?.textContent).toBe('Start building');
    expect(host.textContent).toContain('Connect your own agent once. Then one sentence in it starts your project.');
    expect(stepsOf(host)).toEqual(['current', 'next']);
    expect(textOf(host, '[data-flow-steps] li')).toEqual(['1Your agent', '2Your project']);
    const agent = host.querySelector('[data-build-start-agent="setup"]');
    expect(agent?.querySelector('h2')?.textContent).toBe('1 · Connect your agent');
    expect(agent?.textContent).toContain('Once per computer. Your agent works with the plan you already have.');
    expect(textOf(agent as Element, 'fieldset button')).toEqual([
      'Claude Code',
      'Codex CLI',
      'Cursor',
      'Gemini CLI',
      'Antigravity',
      'VS Code',
    ]);
    expect(agent?.textContent).toContain('For Build it gets one step at a time');
    expect(agent?.textContent).toContain('Disconnect it any time on the Agent page.');
    expect(agent?.textContent).toContain('claude mcp add --scope user --transport http gitranks');
    expect(agent?.textContent).toContain('I added it');
    // Signing in is the one way: no token here.
    expect(agent?.querySelector('[data-token-fold]')).toBeNull();
    expect(agent?.textContent).not.toMatch(/token/i);
    const project = host.querySelector('[data-build-start-project="locked"]');
    expect(project?.getAttribute('aria-disabled')).toBe('true');
    expect(project?.textContent).toBe('2 · Start your projectShows when your agent is connected.');
  });

  it('waiting: the agent added, the waiting line, and no agent buttons', () => {
    const host = screen({ connect: connect({ stage: 'added' }) });
    const agent = host.querySelector('[data-build-start-agent="setup"]') as Element;
    expect(agent.textContent).toContain('GitRanks added to Claude Code. It signs in the first time it calls.');
    expect(agent.textContent).toContain('Show the setup again');
    expect(agent.querySelector('fieldset')).toBeNull();
    expect(agent.textContent).not.toContain('Once per computer');
    expect(agent.querySelector('[role="status"]')?.textContent).toMatch(
      /^Waiting for Claude Code to call GitRanks… Start Claude Code and sign it in\. In Claude Code, type \/mcp/,
    );
    expect(agent.querySelector('[data-agent-late]')).toBeNull();
    expect(host.querySelector('[data-build-start-project="locked"]')).not.toBeNull();
  });

  it('no call after 10 minutes: the same line, in its place, says so with a warning dot', () => {
    const host = screen({ connect: connect({ stage: 'added', late: true }) });
    const status = host.querySelector('[data-agent-late]');
    expect(status?.textContent).toBe(
      'Claude Code has not called GitRanks after 10 minutes. Check that it is running, type /mcp in it and see that gitranks is listed, then choose Authenticate. This page moves on by itself when the call comes.',
    );
    expect(status?.querySelector('.bg-warning')).not.toBeNull();
    expect(status?.querySelector('.bg-primary')).toBeNull();
  });

  it('not signed in: step 1 asks for the GitHub sign-in first', () => {
    const host = screen({ stage: 'sign_in' });
    const agent = host.querySelector('[data-build-start-agent="sign-in"]') as Element;
    expect(agent.textContent).toContain('Your GitHub account is needed from here');
    expect(agent.querySelector('[data-sign-in="build-start"]')?.textContent).toBe('Sign in with GitHub');
    expect(agent.querySelector('fieldset')).toBeNull();
    expect(stepsOf(host)).toEqual(['current', 'next']);
    expect(host.querySelector('[data-build-start-project="locked"]')).not.toBeNull();
  });

  it('connected, from a project: its sentence to say, Copy, and the way back to it', () => {
    const host = screen({
      stage: 'project',
      agent: 'Claude Code',
      project: { kind: 'say', project: startProject, from: 'address' },
    });
    expect(stepsOf(host)).toEqual(['done', 'current']);
    const agent = host.querySelector('[data-build-start-agent="connected"]') as Element;
    expect(agent.querySelector('h2')?.textContent).toBe('Claude Code is connected');
    expect(agent.querySelector('button')?.textContent).toBe('Connect another agent');
    expect(agent.querySelector('fieldset')).toBeNull();
    const project = host.querySelector('[data-build-start-project="say"]') as Element;
    expect(project.querySelector('h2')?.textContent).toBe('2 · Start your project');
    expect(project.textContent).toContain('Say this in Claude Code. It asks which language and which folder');
    expect(project.querySelector('pre')?.textContent).toBe('Teach me how to build an MCP server with GitRanks');
    expect(textOf(project, 'button')).toEqual(['Copy the sentence']);
    expect(project.querySelector('a')?.textContent).toBe('Back to Build an MCP server');
    expect(project.querySelector('a')?.getAttribute('href')).toBe('/build/mcp-server');
    expect(project.textContent).toContain('This page moves on by itself when your build starts');
  });

  it('connected, with no project: the projects as rows to pick from', () => {
    const host = screen({ stage: 'project', agent: 'Claude Code' });
    const project = host.querySelector('[data-build-start-project="pick"]') as Element;
    expect(project.textContent).toContain('Pick what to build. You can build the others later.');
    expect(textOf(project, '[data-build-start-row] > span > span:first-child')).toEqual([
      'Build an MCP server',
      'Build a coding agent',
      'Build an interpreter',
      'Build a key-value database',
      'Build a web server',
    ]);
    expect(project.querySelector('[data-build-start-row="mcp-server"]')?.textContent).toBe(
      'Build an MCP serverA small program that gives your AI agent new tools.Easy · 16 steps · about an hour and a half',
    );
    expect(project.querySelector('pre')).toBeNull();
  });

  it('a project picked from the list: its sentence, and the way back to the list', () => {
    const host = screen({
      stage: 'project',
      agent: 'Claude Code',
      project: { kind: 'say', project: codingAgentCard, from: 'list' },
    });
    const project = host.querySelector('[data-build-start-project="say"]') as Element;
    expect(project.querySelector('pre')?.textContent).toBe('Teach me how to build a coding agent with GitRanks');
    expect(textOf(project, 'button')).toEqual(['Copy the sentence', 'Pick another project']);
    expect(project.querySelector('a')).toBeNull();
  });

  it('an agent connected before: step 1 is done without naming an agent it cannot know, step 2 is open', () => {
    const host = screen({ stage: 'project', agent: null });
    expect(stepsOf(host)).toEqual(['done', 'current']);
    expect(host.querySelector('[data-build-start-agent="connected"] h2')?.textContent).toBe('Your agent is connected');
    expect(host.querySelector('[data-build-start-project="pick"]')).not.toBeNull();
  });

  it('connect another agent: the setup shows again under the connected line', () => {
    const host = screen({ stage: 'project', agent: 'Claude Code', another: true });
    const agent = host.querySelector('[data-build-start-agent="connected"]') as Element;
    expect(agent.querySelector('button[aria-expanded="true"]')?.textContent).toBe('Connect another agent');
    expect(agent.querySelector('fieldset')).not.toBeNull();
  });

  it('no live project to list: one line to the projects, never an empty list', () => {
    const host = screen({ stage: 'project', agent: 'Claude Code', project: { kind: 'pick', projects: [] } });
    const project = host.querySelector('[data-build-start-project="pick"]') as Element;
    expect(project.querySelector('ul')).toBeNull();
    expect(project.querySelector('a')?.getAttribute('href')).toBe('/build/projects');
  });

  it('the build started: both steps done, and the way to the project', () => {
    const host = screen({ stage: 'started', agent: 'Claude Code', build: startedBuild });
    expect(stepsOf(host)).toEqual(['done', 'done']);
    const project = host.querySelector('[data-build-start-project="started"]') as Element;
    expect(project.querySelector('h2')?.textContent).toBe('Your build has started');
    expect(project.textContent).toContain(
      'Build an MCP server, in TypeScript. Your agent is on step 1 of 16. Go on there: it brings in each step, and you try it.',
    );
    expect(textOf(project, 'a')).toEqual(['Open the project', 'Build home']);
    expect([...project.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/build/mcp-server',
      '/build',
    ]);
    expect(project.textContent).toContain('Your place shows on the project’s page and on Build home from now on.');
    expect(host.querySelector('[data-build-start-agent="connected"]')).not.toBeNull();
  });

  it('draws one main button a view', () => {
    const states: Partial<Props>[] = [
      { stage: 'sign_in' },
      { stage: 'agent' },
      { stage: 'project', agent: 'Claude Code', project: { kind: 'say', project: startProject, from: 'address' } },
      { stage: 'started', agent: 'Claude Code', build: startedBuild },
    ];
    for (const state of states) {
      const host = screen(state);
      expect(host.querySelectorAll('[data-slot="button"].bg-primary').length).toBe(1);
    }
  });
});
