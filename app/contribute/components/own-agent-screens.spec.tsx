import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/settings',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/gate.data', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadAttempts: vi.fn(),
  loadRepliesWaiting: vi.fn(),
}));

const { OwnAgentBlock, OWN_AGENT_SAFETY } = await import('@/components/workspace/agent/own-agent-block');
const { AgentScreen } = await import('@/components/workspace/agent/agent-screen');
const { OwnAgentConnectScreen, ConnectScreen } = await import('@/components/workspace/agent/connect-view');
const { NOW, views, contributor } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { contributeNoticesOf } = await import('@/lib/workspace/contribute-state');
const { MCP_SETUPS, MCP_URL, exportLineOf } = await import('@/lib/workspace/mcp-setup');

import type { ContributeOwnAgent, ContributeView } from '@/lib/workspace/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const TOKEN = { id: 'T_1', name: 'laptop', last4: 'Qx9z', createdAt: '2026-10-27T10:00:00.000Z', lastUsedAt: null };
const withTokens: ContributeOwnAgent = { paths: { hosted: false, mcp: true }, tokens: [TOKEN] };

/** A contributor with their own agent alone: a token, no Claude key, no plan. */
const agentOnly: ContributeView = {
  ...views.noKey,
  contributor: contributor({ credentials: [], plan: null, step: 'PREFERENCES', status: 'ACTIVE' }),
  ownAgent: withTokens,
};

describe('the Agent tab, your own agent', () => {
  const SIGNED_IN = {
    id: 'T_2',
    kind: 'OAUTH' as const,
    name: 'Claude Code',
    last4: null,
    clientWhere: { kind: 'LOOPBACK' as const, label: 'this computer' },
    createdAt: '2026-11-12T09:00:00.000Z',
    lastUsedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  };
  const block = (ownAgent: ContributeOwnAgent | undefined) =>
    renderToStaticMarkup(<OwnAgentBlock ownAgent={ownAgent} now={NOW} />);

  it('shows one card per connection: a sign-in by its last call and day, with Disconnect, never a last 4', () => {
    const html = block({ ...withTokens, tokens: [TOKEN, SIGNED_IN] });
    const plain = text(html);
    expect(html).toContain('id="own-agent"');
    expect(html).toContain('data-mcp-token="T_2"');
    expect(plain).toContain('Claude Code Connected Last call 2 hours ago · signed in Nov 12');
    expect(plain).toContain('Disconnect Claude Code');
    expect(plain).not.toContain('gr_…null');
    // A token not used yet is live, not connected.
    expect(plain).toContain('laptop Not used yet No call yet · token gr_…Qx9z');
    expect(plain).toContain('Revoke laptop');
  });

  it('says what it serves, links another connection and the MCP docs, and holds no setup of its own', () => {
    const html = block(withTokens);
    const plain = text(html);
    expect(plain).toContain('Your own agent For Contribute and Learn');
    expect(html).toMatch(/href="\/my\/agent\/connect"[^>]*>Connect another agent/);
    expect(html).toMatch(/href="\/contribute\/mcp"[^>]*>The MCP docs: setup and tools for every agent →/);
    expect(plain).not.toContain('Create token');
    expect(html).not.toContain('data-setup=');
    expect(plain).toContain(OWN_AGENT_SAFETY);
  });

  it('says no agent is connected, with Connect your agent, and when its read failed', () => {
    const none = block({ ...withTokens, tokens: [] });
    expect(text(none)).toContain('No agent is connected.');
    expect(none).toMatch(/href="\/my\/agent\/connect"[^>]*>Connect your agent/);
    expect(text(block(undefined))).toContain("Your connections didn't load. Reload to try again.");
  });

  it('is a block of the Agent tab, and a contributor with their own agent alone sees the hosted pitch, no limits', () => {
    const html = renderToStaticMarkup(<AgentScreen view={agentOnly} now={NOW} />);
    const plain = text(html);
    expect(html.match(/>Your own agent<\/h2>/g)).toHaveLength(1);
    expect(html).toContain('data-hosted="pitch"');
    expect(plain).toContain('Use a Claude key');
    expect(plain).not.toContain('Budget and pacing');
  });

  it('asks no key of a contributor who has their own agent', () => {
    expect(contributeNoticesOf(agentOnly).map(({ kind }) => kind)).not.toContain('no-key');
    expect(contributeNoticesOf(views.noKey).map(({ kind }) => kind)).toContain('no-key');
  });
});

describe('the setup lines', () => {
  it('read the token from the environment in every client but Antigravity, never a pasted token', () => {
    expect(MCP_SETUPS.map(({ client }) => client)).toEqual([
      'claude-code',
      'codex',
      'cursor',
      'gemini-cli',
      'antigravity',
    ]);
    for (const setup of MCP_SETUPS.filter(({ client }) => client !== 'antigravity')) {
      expect(setup.lines).toContain(MCP_URL);
      expect(setup.lines).toContain('GITRANKS_MCP_TOKEN');
      expect(setup.lines).not.toMatch(/gr_[0-9A-Za-z]{10,}/);
    }
    expect(MCP_SETUPS.find(({ client }) => client === 'codex')?.lines).toContain(
      'bearer_token_env_var = "GITRANKS_MCP_TOKEN"',
    );
    expect(JSON.parse(MCP_SETUPS.find(({ client }) => client === 'cursor')?.lines ?? '{}')).toEqual({
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Cursor reads `${env:VAR}` itself; the line holds it as written.
      mcpServers: { gitranks: { url: MCP_URL, headers: { Authorization: 'Bearer ${env:GITRANKS_MCP_TOKEN}' } } },
    });
    expect(JSON.parse(MCP_SETUPS.find(({ client }) => client === 'gemini-cli')?.lines ?? '{}')).toEqual({
      mcpServers: { gitranks: { httpUrl: MCP_URL, headers: { Authorization: 'Bearer $GITRANKS_MCP_TOKEN' } } },
    });
    // Antigravity sends `${VAR}` as written: the placeholder, which the user replaces with the token.
    const antigravity = MCP_SETUPS.find(({ client }) => client === 'antigravity');
    expect(JSON.parse(antigravity?.lines ?? '{}')).toEqual({
      mcpServers: { gitranks: { serverUrl: MCP_URL, headers: { Authorization: 'Bearer <your GitRanks token>' } } },
    });
    expect(antigravity?.lines).not.toMatch(/gr_[0-9A-Za-z]{10,}/);
    expect(antigravity?.where).toContain('~/.gemini/config/mcp_config.json');
    expect(exportLineOf('gr_abc')).toBe('export GITRANKS_MCP_TOKEN="gr_abc"');
  });
});

describe('Connect, with your own agent', () => {
  it('offers the own-agent path beside the key, and that path asks for no key, no preferences and no GitHub access', () => {
    expect(text(renderToStaticMarkup(<ConnectScreen view={views.noKey} today={14} />))).toContain(
      'Use your own agent instead',
    );
    const html = renderToStaticMarkup(
      <OwnAgentConnectScreen
        view={{ ...views.noKey, ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] } }}
      />,
    );
    const plain = text(html);
    expect(html).toContain('data-connect-path="agent"');
    expect(plain).toContain('About a minute · once per computer');
    expect(plain).toContain('Create a GitRanks token');
    // GitHub access is asked for on the first review, and the preferences are guessed.
    expect(plain).not.toContain('GitHub access');
    expect(plain).not.toContain('What you like to work on');
    expect(plain).not.toContain('Paste the key');
  });
});
