import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('./live-refresh', () => ({ LiveRefresh: () => <span data-live-refresh /> }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));

const { AgentConnect, AgentConnectView } = await import('./agent-connect');
const { OverviewScreen, overviewSectionsOf } = await import('./overview-status');
const { overviewData } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { IssuesScreen } = await import('./issues-view');
const { NOW, mcpToken, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { AGENT_HELLO_PROMPT, AGENT_WORK_PROMPT } = await import('@/lib/contribute/agent-connect');

import type { ComponentProps } from 'react';

import type { ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, ' ');

/** A made-up token of the real shape: `gr_` and 43 base62 characters. */
const TOKEN = 'gr_8Kq2vN4tXb7RwL1mZc9HpYe3Ud6SfA0jQg5Ko2Ti8Lm';

const noop = () => {};
const b1 = (props: Partial<ComponentProps<typeof AgentConnectView>> = {}) => {
  const html = renderToStaticMarkup(
    <AgentConnectView
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
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

describe('B1, your own agent', () => {
  it('starts on the agent and the token, the hello still to come', () => {
    const { html, plain } = b1();

    expect(html).toContain('data-agent-stage="none"');
    expect(html).toContain('data-agent-hello="next"');
    expect(plain).toContain('Connect your own agent');
    expect(plain).toContain('Use your Claude key instead');
    for (const client of ['Claude Code', 'Codex CLI', 'Cursor', 'Gemini CLI']) expect(plain).toContain(client);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Claude Code</);
    expect(plain).toContain("It can't open a pull request or spend anything");
    expect(plain).toContain('Create a GitRanks token');
    expect(plain).toContain('We name it “Claude Code on macOS”');
    expect(plain).toContain('Creating a token never revokes the others: up to 5 stay live');
    expect(plain).toContain('Comes next, once GitRanks is added to Claude Code');
    expect(html).not.toContain('data-token-ready');
  });

  it('shows the token whole this once, in the save line of the OS detected, and the setup of the client picked', () => {
    const { html, plain } = b1({ stage: 'token', shown: TOKEN, client: 'codex', os: 'linux', detectedOs: 'linux' });

    expect(html).toContain('data-token-ready');
    expect(html).toMatch(new RegExp(`<code data-token[^>]*>${TOKEN}</code>`));
    expect(plain).toContain('Your GitRanks token is ready. We show it only this once.');
    expect(plain).toContain('We detected Linux.');
    expect(plain).toContain(`echo 'export GITRANKS_MCP_TOKEN="${TOKEN}"' >> ~/.bashrc && source ~/.bashrc`);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Linux</);
    expect(plain).toContain('b · Add GitRanks to Codex CLI');
    expect(plain).toContain('~/.codex/config.toml');
    expect(plain).toContain('bearer_token_env_var = "GITRANKS_MCP_TOKEN"');
    expect(plain).toContain('Keep it out of your shell history');
    expect(plain).toContain("I've added it");
    expect(plain).toContain('Lost it before saving it? Make a new one');
    expect(plain).toContain('A new one revokes this token, so only one stays live');
    expect(plain).toContain('creating a token never revokes the others: up to 5 stay live, listed in Settings');
    // Every copy icon is a 44px button with a name.
    expect(html).toContain('aria-label="Copy the token"');
    expect(html).toContain('aria-label="Copy the command"');
    expect(html).toContain('aria-label="Copy the setup"');
  });

  it("takes Windows' forms when it is picked, and says nothing was detected for an OS it did not detect", () => {
    const { plain } = b1({ stage: 'token', shown: TOKEN, os: 'windows', detectedOs: 'mac' });

    expect(plain).not.toContain('We detected');
    expect(plain).toContain(`[Environment]::SetEnvironmentVariable("GITRANKS_MCP_TOKEN", "${TOKEN}", "User")`);
    expect(plain).toContain('PowerShell');
    expect(plain).toContain('--header "Authorization: Bearer $env:GITRANKS_MCP_TOKEN"');
  });

  it('marks the setup done, offers it again, and waits for the first call with the prompt to send', () => {
    const { html, plain } = b1({ stage: 'added', shown: TOKEN, client: 'cursor' });

    expect(html).toContain('data-agent-stage="added"');
    expect(html).toContain('data-agent-hello="waiting"');
    expect(plain).toContain('Token created and GitRanks added to Cursor');
    expect(plain).toContain('Show the setup again');
    expect(plain).toContain('Prompt for Cursor');
    expect(plain).toContain(AGENT_HELLO_PROMPT);
    expect(plain).toContain('Waiting for your agent to connect…');
    expect(plain).toContain('This page moves on by itself the moment it calls');
    // The token is not on the page once the setup is done.
    expect(html).not.toContain(TOKEN);
    expect(html).not.toContain('data-agent-hint');
  });

  it('says where the variable must be once the wait has been long', () => {
    expect(b1({ stage: 'added', shown: TOKEN, hint: true }).plain).toContain(
      'echo $GITRANKS_MCP_TOKEN should print your token',
    );
    expect(b1({ stage: 'added', shown: TOKEN, os: 'windows', hint: true }).plain).toContain(
      'echo $env:GITRANKS_MCP_TOKEN should print your token',
    );
  });

  it('announces the hint from the waiting status, and says to run the setup again after a new token', () => {
    const { html, plain } = b1({ stage: 'added', shown: TOKEN, hint: true });
    expect(html).toMatch(/role="status" aria-live="polite"[^>]*>(?:(?!<\/section>).)*data-agent-hint/s);
    expect(plain).toContain('If you made a new token since you added GitRanks, run the setup again');
    expect(b1({ stage: 'added', shown: TOKEN, client: 'codex', hint: true }).plain).toContain(
      'If you made a new token since, restart Codex CLI',
    );
  });

  it("starts Claude Code's setup by removing the old entry once the token replaced another", () => {
    const { plain } = b1({ stage: 'token', shown: TOKEN, replaced: true });
    expect(plain).toContain('claude mcp remove --scope user gitranks 2>/dev/null; claude mcp add');
    expect(plain).toContain('Claude Code keeps the token it read when GitRanks was added');
    expect(b1({ stage: 'token', shown: TOKEN }).plain).not.toContain('claude mcp remove');
  });

  it('says the old token is revoked when the new one could not be made, and offers to try again', () => {
    const { html, plain } = b1({
      stage: 'none',
      revokedOnly: true,
      error: 'Something went wrong. Try again in a minute.',
    });
    expect(html).toContain('data-agent-error');
    expect(plain).toContain("Your old token is revoked, and a new one wasn't made.");
    expect(plain).toContain('Try again');
    expect(plain).not.toContain('Creating a token never revokes the others');
  });

  it('takes the token off the page once the agent has called', () => {
    const { html, plain } = b1({ stage: 'token', shown: TOKEN, connected: true });
    expect(html).not.toContain(TOKEN);
    expect(html).not.toContain('data-token-ready');
    expect(plain).toContain('Your agent is connected. Taking you on…');
    expect(plain).not.toContain('Show the setup again');
  });

  it('says Copied from beside each copy button, not inside it', () => {
    const { html } = b1({ stage: 'token', shown: TOKEN });
    expect(html).toMatch(/aria-label="Copy the token"[^>]*>(?:(?!<\/button>).)*<\/button><span role="status"/s);
    expect(html).not.toMatch(/<button[^>]*aria-label="Copy[^"]*"[^>]*>(?:(?!<\/button>).)*aria-live/s);
  });

  it('brings a user back mid-setup to the hello, the token not shown again but replaceable', () => {
    const { html, plain } = b1({ stage: 'added', pending: mcpToken() });

    expect(html).toContain('data-agent-hello="waiting"');
    expect(plain).toContain('Your token is live (Claude Code on macOS, gr_…Qx9z');
    expect(plain).toContain("your agent hasn't called with it yet");
    expect(plain).toContain('Lost it before saving it? Make a new one');
    expect(plain).not.toContain('Show the setup again');
  });

  it('sends a user with every token taken to Settings, and says when tokens are not available yet', () => {
    const full = b1({ full: true });
    expect(full.plain).toContain('You have 5 live tokens. Revoke one in Settings to create another.');
    expect(full.html).toMatch(/<button[^>]* type="button" disabled=""[^>]*>Create a GitRanks token/);
    expect(b1({ unavailable: true }).plain).toContain('Not available yet');
  });

  it('opens on the hello for a user who left mid-setup, and on the token otherwise', () => {
    const back = renderToStaticMarkup(<AgentConnect onboarded={false} tokens={views.midSetup.ownAgent.tokens} />);
    expect(back).toContain('data-agent-stage="added"');
    expect(back).toContain('gr_…Qx9z');

    const again = renderToStaticMarkup(<AgentConnect onboarded tokens={views.agentOnboarded.ownAgent.tokens} />);
    expect(again).toContain('data-agent-stage="none"');
    expect(renderToStaticMarkup(<AgentConnect onboarded={false} tokens={[]} />)).toContain('data-agent-stage="none"');
  });
});

const ISSUE = {
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'fern-lang/fern',
  number: 2481,
  url: 'https://github.com/fern-lang/fern/issues/2481',
  title: 'Formatter drops a trailing comment in match arms',
  labels: [],
  language: 'RUST' as const,
  kind: 'BUG' as const,
  size: 'S' as const,
  score: 0.9,
  rank: 1,
  why: 'you write Rust',
};
const page: ContributeIssuePage = {
  items: [1, 2, 3, 4].map((rank) => ({ ...ISSUE, issueId: `I_${rank}`, number: 2480 + rank, rank })),
  next: null,
  total: 4,
  computedAt: '2026-10-28T11:59:00.000Z',
};
const ranking: ContributeIssuePage = { items: [], next: null, total: 0, computedAt: null };

/** Overview's sections from reads that all answered. */
const sections = (view: ContributeView) => overviewSectionsOf(view, overviewData(), NOW);

describe('B2, your agent is connected', () => {
  it('welcomes the client picked, says what happens next, and that the first picks are still being ranked', () => {
    const html = renderToStaticMarkup(
      <OverviewScreen
        view={views.agentOnboarded}
        sections={sections(views.agentOnboarded)}
        welcome="codex"
        agentFirstRun={{ page: ranking }}
        now={NOW}
      />,
    );
    const plain = text(html);

    expect(html).toContain('data-agent-welcome="codex"');
    expect(html).toMatch(/<h1[^>]*>Your agent is connected<\/h1>/);
    expect(html).not.toContain('>Overview</h1>');
    expect(plain).toContain('Codex CLI called GitRanks a moment ago');
    expect(plain).toContain('What happens next');
    expect(plain).toContain('Prompt for Codex CLI');
    expect(plain).toContain(AGENT_WORK_PROMPT);
    expect(plain).toContain("held for you 24 hours from your agent's last step, and 7 days at most");
    expect(plain).toContain('The first time, GitHub asks you for one permission');
    expect(plain).toContain("We guessed what you'd like: bugs, Rust first.");
    // Their own agent spends nothing through us: no cap, no pace.
    expect(plain).not.toContain('monthly cap');
    expect(plain).toContain('Change it in Settings');
    expect(html).toContain('data-agent-picks="ranking"');
    expect(plain).toContain('Your first picks are still being ranked');
    expect(html).toContain('data-ranking="waiting"');
  });

  it('shows the top three picks once they are ranked', () => {
    const html = renderToStaticMarkup(
      <OverviewScreen
        view={views.agentOnboarded}
        sections={sections(views.agentOnboarded)}
        welcome="claude-code"
        agentFirstRun={{ page }}
        now={NOW}
      />,
    );
    const plain = text(html);

    expect(html).toContain('data-agent-picks="ready"');
    expect(html).not.toContain('data-ranking=');
    expect(plain).toContain('What your agent sees first');
    expect(plain).toContain('fern-lang/fern · #2481');
    expect(plain).toContain('bug · Rust · size S');
    expect(html.match(/data-issue="/g)).toHaveLength(3);
    expect(html).not.toContain('data-issue="I_4"');
  });

  it("keeps the welcome and gives way to Overview's sections once the agent has made an attempt", () => {
    const html = renderToStaticMarkup(
      <OverviewScreen
        view={views.agentOnboarded}
        sections={sections(views.agentOnboarded)}
        welcome="cursor"
        now={NOW}
      />,
    );

    expect(html).toContain('data-agent-welcome="cursor"');
    expect(html).not.toContain('data-agent-next');
  });

  it("says the user's pause holds the agent's claim in step 1, its notice left out, and keeps a key's notices", () => {
    const paused = renderToStaticMarkup(
      <OverviewScreen
        view={{ ...views.agentOnboarded, paused: true }}
        sections={sections({ ...views.agentOnboarded, paused: true })}
        welcome="claude-code"
        agentFirstRun={{ page }}
        now={NOW}
      />,
    );
    expect(paused).toContain('data-agent-step="paused"');
    expect(text(paused)).toContain('Contributing is paused');
    expect(text(paused)).toContain('Resume');
    expect(paused).not.toContain('data-notice="paused"');

    // A refused key holds the attempts we run, not the agent's: its notice stays, and step 1 is the agent's claim.
    const invalid = renderToStaticMarkup(
      <OverviewScreen
        view={{ ...views.keyInvalid, ownAgent: views.agentOnboarded.ownAgent }}
        sections={sections({ ...views.keyInvalid, ownAgent: views.agentOnboarded.ownAgent })}
        welcome="claude-code"
        agentFirstRun={{ page }}
        now={NOW}
      />,
    );
    expect(invalid).not.toContain('data-agent-step="paused"');
    expect(text(invalid)).toContain('your agent claims an issue');
    expect(invalid).toContain('data-notice="key-invalid"');
  });

  it('opens Overview and Issues with the next steps, before the first attempt, without the welcome', () => {
    const overview = renderToStaticMarkup(
      <OverviewScreen
        view={views.agentOnboarded}
        sections={sections(views.agentOnboarded)}
        agentFirstRun={{ page }}
        now={NOW}
      />,
    );
    expect(overview).toContain('>Overview</h1>');
    expect(overview).not.toContain('data-agent-welcome');
    expect(text(overview)).toContain('Prompt for your agent');

    const issues = text(
      renderToStaticMarkup(<IssuesScreen view={views.agentOnboarded} page={page} query={{}} now={NOW} agentFirstRun />),
    );
    expect(issues).toContain('What happens next');
    expect(issues).toContain('Picked for you');
    expect(issues).not.toContain('What your agent sees first');
  });
});
