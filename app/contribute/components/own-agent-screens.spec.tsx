import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('./live-refresh', () => ({ LiveRefresh: () => <span data-live-refresh /> }));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
  loadOpenPrDrafts: vi.fn(),
}));

const { OwnAgentSection, OWN_AGENT_SAFETY } = await import('./own-agent-section');
const { SettingsScreen } = await import('./settings-view');
const { OwnAgentConnectScreen, ConnectScreen } = await import('./connect-view');
const { ReviewScreen } = await import('./review-view');
const { ContributionsScreen } = await import('./contributions-view');
const { NOW, views, contributor } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { attempt, contributions, detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { contributeNoticesOf } = await import('@/lib/contribute/contribute-state');
const { MCP_SETUPS, MCP_URL, exportLineOf } = await import('@/lib/contribute/mcp-setup');

import type { ContributeOwnAgent, ContributeView } from '@/lib/contribute/contribute.types';

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

describe('Settings, your own agent', () => {
  it('lists the tokens by their last 4 alone, with the setup for each client and the safety line', () => {
    const html = renderToStaticMarkup(<OwnAgentSection ownAgent={withTokens} now={NOW} />);
    const plain = text(html);

    expect(html).toContain('id="own-agent"');
    expect(html).toContain('data-mcp-token="T_1"');
    expect(plain).toContain('gr_…Qx9z');
    expect(plain).toContain('never used');
    expect(plain).toContain('Create token');
    expect(html).toContain('data-setup="claude-code"');
    expect(plain).toContain(`claude mcp add --scope user --transport http gitranks ${MCP_URL}`);
    expect(plain).toContain(OWN_AGENT_SAFETY);
  });

  it('says it is coming while the API does not answer it, and offers no create', () => {
    const plain = text(renderToStaticMarkup(<OwnAgentSection ownAgent={undefined} now={NOW} />));
    expect(plain).toContain('Not available yet');
    expect(plain).not.toContain('Create token');
  });

  it('is a section of Settings, and a contributor with their own agent alone sees no spending limits to set', () => {
    const plain = text(renderToStaticMarkup(<SettingsScreen view={agentOnly} now={NOW} />));
    expect(plain).toContain('Your own agent (MCP)');
    expect(plain).toContain('Your own agent spends nothing through us');
    expect(plain).not.toContain('Cycle cap');
  });

  it('asks no key of a contributor who has their own agent', () => {
    expect(contributeNoticesOf(agentOnly).map(({ kind }) => kind)).not.toContain('no-key');
    expect(contributeNoticesOf(views.noKey).map(({ kind }) => kind)).toContain('no-key');
  });
});

describe('the setup lines', () => {
  it('read the token from the environment in every client, never a pasted token', () => {
    expect(MCP_SETUPS.map(({ client }) => client)).toEqual(['claude-code', 'codex', 'cursor', 'gemini-cli']);
    for (const setup of MCP_SETUPS) {
      expect(setup.lines).toContain(MCP_URL);
      expect(setup.lines).toContain('GITRANKS_MCP_TOKEN');
      expect(setup.lines).not.toMatch(/gr_[0-9A-Za-z]{10,}/);
    }
    expect(MCP_SETUPS.find(({ client }) => client === 'codex')?.lines).toContain(
      'bearer_token_env_var = "GITRANKS_MCP_TOKEN"',
    );
    expect(JSON.parse(MCP_SETUPS.find(({ client }) => client === 'cursor')?.lines ?? '{}')).toEqual({
      mcpServers: { gitranks: { url: MCP_URL, headers: { Authorization: 'Bearer ${env:GITRANKS_MCP_TOKEN}' } } },
    });
    expect(JSON.parse(MCP_SETUPS.find(({ client }) => client === 'gemini-cli')?.lines ?? '{}')).toEqual({
      mcpServers: { gitranks: { httpUrl: MCP_URL, headers: { Authorization: 'Bearer $GITRANKS_MCP_TOKEN' } } },
    });
    expect(exportLineOf('gr_abc')).toBe('export GITRANKS_MCP_TOKEN="gr_abc"');
  });
});

describe('Connect, with your own agent', () => {
  it('offers the own-agent path beside the key, and that path asks for no key', () => {
    expect(text(renderToStaticMarkup(<ConnectScreen view={views.noKey} today={14} />))).toContain(
      'Use your own agent instead',
    );
    const html = renderToStaticMarkup(
      <OwnAgentConnectScreen
        view={{ ...views.noKey, ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] } }}
        now={NOW}
      />,
    );
    const plain = text(html);
    expect(html).toContain('data-connect-path="agent"');
    expect(plain).toContain('No Claude key is needed');
    // GitHub access is asked for on the first review, not here.
    expect(plain).not.toContain('GitHub access');
    expect(plain).toContain('Step 1 · What you like to work on');
    expect(plain).toContain('Step 2 · A token for your agent');
    expect(plain).toContain('Save, then create a token');
    expect(plain).toContain('Create token');
    expect(plain).not.toContain('Paste your key');
  });
});

describe('the review of a change made by your own agent', () => {
  const ownAgentDetail = detail({
    runner: 'MCP',
    agent: { name: 'CODEX', model: 'gpt-5.5-codex' },
    sendBacksLeft: 2,
    changesRequested: null,
    leaseUntil: null,
    openedBy: null,
    costUsd: 0,
    budgetUsd: 0,
  });

  it('names the agent as reported in place of a cost, and the tests as reported', () => {
    const html = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={ownAgentDetail} now={NOW} />);
    const plain = text(html);
    expect(html).toContain('data-panel="own-agent"');
    expect(plain).toContain('Codex (gpt-5.5-codex)');
    expect(plain).toContain('Tests reported by your agent');
    expect(html).not.toContain('data-panel="cost"');
  });

  it('offers to send it back, with how many times are left, and stops offering at none', () => {
    const plain = text(renderToStaticMarkup(<ReviewScreen view={views.active} attempt={ownAgentDetail} now={NOW} />));
    expect(plain).toContain('Send back to my agent');
    expect(plain).toContain('2 more times');
    const none = text(
      renderToStaticMarkup(
        <ReviewScreen view={views.active} attempt={{ ...ownAgentDetail, sendBacksLeft: 0 }} now={NOW} />,
      ),
    );
    expect(none).toContain('Submit it as it is, or discard it');
  });

  it('starts the title from the one the agent proposed', () => {
    const html = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={{
          ...ownAgentDetail,
          result: ownAgentDetail.result && { ...ownAgentDetail.result, prTitle: 'fix: nested layouts' },
        }}
        now={NOW}
      />,
    );
    expect(html).toContain('value="fix: nested layouts"');
  });

  it('keeps the hosted review as it was', () => {
    const html = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={detail()} now={NOW} />);
    expect(html).toContain('data-panel="cost"');
    expect(text(html)).not.toContain('Send back to my agent');
  });
});

describe('My contributions, with your own agent', () => {
  it('shows who made each PR and the lease of the work in progress', () => {
    const [first, ...rest] = contributions.items;
    const html = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={{
          ...contributions,
          items: [{ ...first, runner: 'MCP', agent: { name: 'CLAUDE_CODE', model: null }, openedBy: 'HAND' }, ...rest],
        }}
        attempts={[
          attempt({
            attemptId: 'A_W',
            state: 'RUNNING',
            runner: 'MCP',
            agent: { name: 'CURSOR', model: null },
            leaseUntil: '2026-10-29T12:00:00.000Z',
          }),
        ]}
        drafts={{}}
        now={NOW}
      />,
    );
    const plain = text(html);
    expect(plain).toContain('Claude Code');
    expect(plain).toContain('opened by hand');
    expect(plain).toContain('Cursor is on it');
    expect(plain).toContain('held for it for another');
    expect(plain).not.toContain('until in');
  });
});
