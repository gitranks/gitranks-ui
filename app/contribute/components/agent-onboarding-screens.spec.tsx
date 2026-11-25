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
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadIssues: vi.fn() }));

const { AgentConnect, AgentConnectView } = await import('@/components/workspace/agent/agent-connect');
const { mcpToken, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { AGENT_FIRST_PROMPT } = await import('@/lib/workspace/mcp-setup');

import type { ComponentProps } from 'react';

import type { ContributeIssuePage } from '@/lib/workspace/contribute.types';

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

describe('B1, your own agent, once agents sign in', () => {
  it("shows the client's sign-in line, with the token in a fold under it", () => {
    const { html, plain } = b1({ signIn: true });
    expect(html).toContain('data-agent-sign-in="setup"');
    expect(plain).toContain('claude mcp add --scope user --transport http gitranks https://mcp.gitranks.com/mcp');
    expect(plain).toContain('choose Authenticate');
    expect(plain).toContain('I added it');
    expect(plain).toContain('Use a token instead');
    expect(plain).toContain('Create a GitRanks token');
    expect(plain).toContain("It can't open a pull request, push or post on GitHub");
  });

  it("signs Antigravity in from the agent window's Customizations, the token in a fold", () => {
    const { html, plain } = b1({ signIn: true, client: 'antigravity' });
    expect(html).toContain('data-agent-sign-in="setup"');
    expect(plain).toContain('"serverUrl": "https://mcp.gitranks.com/mcp"');
    expect(plain).toContain('click Sign in next to gitranks');
    expect(plain).toContain("Don't use the Authenticate button on the Manage MCP Servers page");
    expect(plain).toContain('Use a token instead');
    expect(plain).not.toContain("can't sign in with GitHub yet");
    const hint = b1({ signIn: true, client: 'antigravity', stage: 'added', hint: true }).plain;
    expect(hint).toContain("In the agent's window, open Customizations");
    // Once added, the next step is the sign-in click, not a sign-in on the first call.
    expect(hint).toContain('GitRanks added to Antigravity. Now sign in.');
    expect(hint).not.toContain('It signs in the first time it calls.');
  });

  it('once added, waits for the first call with what to check', () => {
    const { html, plain } = b1({ signIn: true, client: 'codex', stage: 'added', hint: true });
    expect(html).toContain('data-agent-sign-in="added"');
    expect(plain).toContain('GitRanks added to Codex CLI. It signs in the first time it calls.');
    expect(html).toContain('data-agent-hello="waiting"');
    expect(plain).toContain('Nothing yet? Run codex mcp login gitranks again');
  });
});

describe('B1, your own agent', () => {
  it('starts on the agent and the token, the hello still to come', () => {
    const { html, plain } = b1();

    expect(html).toContain('data-agent-stage="none"');
    expect(html).toContain('data-agent-hello="next"');
    expect(plain).toContain('Connect your own agent');
    expect(plain).toContain('About a minute · once per computer');
    expect(html).toMatch(/href="\/my\/agent"[^>]*>.*Agent<\/a>/);
    expect(plain).toContain('Contributing only? You can also use a Claude key →');
    expect(html).toMatch(/data-key-link=""[^>]*>.*href="\/my\/agent\/key"/);
    expect(plain).toContain('One connection serves Contribute and Learn.');
    for (const client of ['Claude Code', 'Codex CLI', 'Cursor', 'Gemini CLI']) expect(plain).toContain(client);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Claude Code</);
    expect(plain).toContain("It can't open a pull request or spend anything");
    expect(plain).toContain('Create a GitRanks token');
    expect(html).toMatch(/data-token-name=""[^>]*>.*Token name.*value="Claude Code on macOS"/);
    expect(plain).toContain('We list it on the Agent tab by this name.');
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
    expect(plain).toContain('creating a token never revokes the others: up to 5 stay live, listed on the Agent tab');
    // Every copy icon is a 44px button with a name.
    expect(html).toContain('aria-label="Copy the token"');
    expect(html).toContain('aria-label="Copy the command"');
    expect(html).toContain('aria-label="Copy the setup"');
  });

  it("puts the token in Antigravity's config itself, with no step that saves it on the computer", () => {
    const { html, plain } = b1({ stage: 'token', shown: TOKEN, client: 'antigravity', os: 'mac', detectedOs: 'mac' });

    expect(plain).not.toContain('Save the token on this computer');
    expect(plain).not.toContain('GITRANKS_MCP_TOKEN');
    expect(plain).toContain('The setup below already includes it.');
    expect(plain).toContain('Add GitRanks to Antigravity');
    expect(plain).not.toContain('b · Add GitRanks');
    expect(plain).toContain('~/.gemini/config/mcp_config.json');
    expect(plain).toContain('"serverUrl": "https://mcp.gitranks.com/mcp"');
    expect(plain).toContain(`"Authorization": "Bearer ${TOKEN}"`);
    expect(plain).toContain('keep the file to yourself');
    expect(html).toContain('aria-label="Copy the setup"');
    // The OS is picked beside the setup, as the config's path depends on it.
    expect(html).toContain('aria-pressed="true"');
    expect(plain).toContain('⋮ next to gitranks → Restart');
    const hint = b1({ stage: 'added', shown: TOKEN, client: 'antigravity', hint: true }).plain;
    expect(hint).toContain("Check that the gitranks entry in Antigravity's MCP config holds your latest token");
    expect(hint).toContain('in the CLI, /mcp');
  });

  it("gives Antigravity the Windows path, and the new token's line once it replaced another", () => {
    const windows = b1({ stage: 'token', shown: TOKEN, client: 'antigravity', os: 'windows', detectedOs: 'mac' });
    expect(windows.plain).toContain('%USERPROFILE%\\.gemini\\config\\mcp_config.json');
    expect(windows.plain).not.toContain('~/.gemini');

    const replaced = b1({ stage: 'token', shown: TOKEN, client: 'antigravity', os: 'mac', replaced: true }).plain;
    expect(replaced).toContain('put the new token in the Authorization line of the gitranks entry');
    expect(replaced).toContain(`"Authorization": "Bearer ${TOKEN}"`);
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
    expect(plain).toContain(AGENT_FIRST_PROMPT);
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

  it('says one connection serves both sides, and leaves the key out for Learn alone', () => {
    const { plain } = b1({ keyLink: false });
    expect(plain).toContain(
      'Nothing reaches GitHub before you approve it. One connection serves Contribute and Learn.',
    );
    expect(plain).not.toContain('You can also use a Claude key');
  });

  it('stays once the agent says hello for someone in the workspace already, with the next step', () => {
    const both = b1({ stage: 'added', connected: true, stay: true });
    expect(both.plain).toContain('Your agent is connected.');
    expect(both.plain).not.toContain('Taking you on');
    expect(both.plain).toContain('Next, pick an issue on Contribute or Learn and press Start.');
    expect(both.html).toMatch(/data-agent-next=""[^>]*>.*href="\/contribute".*href="\/learn\/issues"/);
    // Before the call, and on the way back to a proof, there is no next step here.
    expect(b1({ stage: 'added', stay: true }).html).not.toContain('data-agent-next');
    expect(
      b1({ stage: 'added', connected: true, stay: true, proof: { attemptId: 'A_1', prompt: 'p', prNumber: 7 } }).html,
    ).not.toContain('data-agent-next');
  });

  it('stays without the Contribute sign on the Agent tab, with "Finish setting up" to the setup and Learn', () => {
    const learner = b1({ stage: 'added', connected: true, stay: true, finishSetup: true });
    expect(learner.plain).toContain(
      'Your agent is connected. Finish setting up to take issues on Contribute, or pick an issue on Learn and press Start.',
    );
    expect(learner.html).toMatch(
      /data-agent-next="finish-setup"[^>]*>.*href="\/contribute\/start".*href="\/learn\/issues"/,
    );
    expect(learner.html).not.toContain('data-agent-next=""');
    expect(learner.plain).not.toContain('Taking you on');
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
    expect(full.plain).toContain('You have 5 live tokens. Revoke one on the Agent tab to create another.');
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

describe('B1 embedded in another page (the Start page)', () => {
  it('keeps the agent and its setup, without the back link, the title, the Claude key link or the first prompt', () => {
    const { html, plain } = b1({ embedded: true, stage: 'token', shown: TOKEN });
    expect(html).toContain('data-connect-mode="embedded"');
    expect(html).not.toContain('<h1');
    expect(html).not.toContain('<h2');
    expect(html).not.toContain('href="/my/agent"');
    expect(plain).not.toContain('Connect your own agent');
    expect(plain).not.toContain('Claude key');
    expect(plain).not.toContain(AGENT_FIRST_PROMPT);
    expect(plain).toContain('Claude Code');
    expect(plain).toContain('Your GitRanks token is ready.');
    expect(plain).toContain(TOKEN);
    expect(plain).toContain("I've added it");
  });

  it('once added, waits for the call that starting the agent makes, with no prompt to send', () => {
    const { html, plain } = b1({ embedded: true, stage: 'added', shown: TOKEN });
    expect(html).toContain('data-agent-hello="waiting"');
    expect(plain).toContain('Waiting for Claude Code to call GitRanks…');
    expect(plain).toContain('Start Claude Code, or restart it if it is open: it calls GitRanks as it starts.');
    expect(plain).not.toContain(AGENT_FIRST_PROMPT);
    expect(plain).not.toContain('Taking you on');
  });

  it("says how to sign the agent in while it waits, the hint's check not said twice", () => {
    const { plain } = b1({ embedded: true, signIn: true, stage: 'added', hint: true });
    expect(plain).toContain('Start Claude Code and sign it in. In Claude Code, type /mcp');
    expect(plain.match(/type \/mcp/g)).toHaveLength(1);
  });

  it('shows nothing of the hello before the setup is added', () => {
    const { html } = b1({ embedded: true });
    expect(html).not.toContain('data-agent-hello');
    expect(html).toContain('data-agent-stage="none"');
  });

  it('starts on the same stage as on Contribute', () => {
    const back = renderToStaticMarkup(
      <AgentConnect embedded onboarded={false} tokens={views.midSetup.ownAgent.tokens} />,
    );
    expect(back).toContain('data-agent-stage="added"');
    expect(back).toContain('data-connect-mode="embedded"');
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
const _page: ContributeIssuePage = {
  items: [1, 2, 3, 4].map((rank) => ({ ...ISSUE, issueId: `I_${rank}`, number: 2480 + rank, rank })),
  next: null,
  total: 4,
  computedAt: '2026-10-28T11:59:00.000Z',
};
const _ranking: ContributeIssuePage = { items: [], next: null, total: 0, computedAt: null };
