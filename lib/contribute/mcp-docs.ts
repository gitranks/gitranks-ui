import { MCP_CONNECTOR_NAME } from '@/lib/workspace/mcp-install-links';
import {
  AGENT_FIRST_PROMPT,
  MCP_CLIENT_NAMES,
  MCP_CLIENTS,
  MCP_OS_NAMES,
  MCP_OSES,
  MCP_TOKEN_ENV,
  MCP_TOKEN_PLACEHOLDER,
  MCP_TOKENS_MAX,
  MCP_URL,
  type McpClient,
  mcpClientSetupOf,
  mcpSignInSetupOf,
  mcpTokenSaveOf,
} from '@/lib/workspace/mcp-setup';
import {
  VS_CODE_SIGN_IN,
  VS_CODE_TOKEN_FILE,
  VS_CODE_TOKEN_LINES,
  VS_CODE_TOKEN_WHERE,
} from '@/lib/workspace/own-agent-setups';
import { settingsPathOf } from '@/lib/workspace/paths';

/** What the docs put where a token goes: never a real one. The setup's own placeholder. */
export const TOKEN_PLACEHOLDER = MCP_TOKEN_PLACEHOLDER;

/** One client's setup on the MCP docs page, its anchor the client's id. */
export type McpDocClient = {
  id: string;
  name: string;
  /** What to do with the lines. */
  where: string;
  /** The block's header: the shell, or the config file's path. */
  label: string;
  file: boolean;
  lines: string;
  /** A line under the block: another way to add it, or what the client can do with GitRanks. */
  after?: string;
  /** Where Windows differs: what to do, the block's header and lines there. */
  windows?: { where: string; label: string; lines: string };
};

/** A client the connect flow knows, as the docs show it: macOS and Linux first, Windows where it differs. */
function connectClientOf(client: McpClient): McpDocClient {
  const unix = mcpClientSetupOf(client, 'mac');
  const windows = mcpClientSetupOf(client, 'windows');
  return {
    id: client,
    name: unix.name,
    where: unix.where,
    label: unix.label,
    file: unix.file,
    lines: unix.lines,
    windows:
      windows.label !== unix.label || windows.lines !== unix.lines || windows.where !== unix.where
        ? { where: windows.where, label: windows.label, lines: windows.lines }
        : undefined,
  };
}

/** VS Code: in the docs, and in the connect step on the page of one issue (`own-agent-setups`). */
const VS_CODE: McpDocClient = {
  id: 'vs-code',
  name: 'VS Code',
  where: VS_CODE_TOKEN_WHERE,
  label: VS_CODE_TOKEN_FILE,
  file: true,
  lines: VS_CODE_TOKEN_LINES,
};

/** The clients the docs show, in the connect flow's order, then VS Code. */
export const MCP_DOC_CLIENTS: readonly McpDocClient[] = [...MCP_CLIENTS.map(connectClientOf), VS_CODE];

/** A client's setup when agents sign in with GitHub: no token, the agent opens GitRanks in the browser to allow it. */
export type McpDocSignIn = Omit<McpDocClient, 'id' | 'name'>;

/** A client the connect flow knows, signing in. */
function connectSignInOf(client: McpClient): McpDocSignIn {
  const unix = mcpSignInSetupOf(client, 'mac');
  const windows = mcpSignInSetupOf(client, 'windows');
  return {
    where: unix.where,
    label: unix.label,
    file: unix.file,
    lines: unix.lines,
    windows:
      windows.label !== unix.label || windows.lines !== unix.lines || windows.where !== unix.where
        ? { where: windows.where, label: windows.label, lines: windows.lines }
        : undefined,
  };
}

/**
 * The Codex app and the IDE extension add a server in their settings, not with the CLI's lines (checked 2026-11-14).
 * Docs only: the connect flow sets up the CLI.
 */
const CODEX_APP = `In the Codex app or the IDE extension: Settings → MCP servers → Add server → Streamable HTTP, enter ${MCP_URL}, then restart Codex. If it asks you to sign in, your browser opens GitRanks, where you allow it.`;

/** Each client's sign-in setup by its id. */
export const MCP_DOC_SIGN_INS: Readonly<Record<string, McpDocSignIn>> = Object.fromEntries([
  ...MCP_CLIENTS.map((client) => {
    const setup = connectSignInOf(client);
    return [client, client === 'codex' ? { ...setup, after: CODEX_APP } : setup] as const;
  }),
  [VS_CODE.id, VS_CODE_SIGN_IN],
]);

/** claude.ai and Claude Desktop: a connector by URL, which can only sign in (it sends no header of ours). */
export const CLAUDE_APP_DOC: McpDocClient = {
  id: 'claude-app',
  name: 'claude.ai and Claude Desktop',
  where:
    'In Claude, open Customize → Connectors → Add → Add custom connector, and paste this URL. Then press Connect: Claude opens GitRanks in your browser, where you allow it.',
  label: 'Connector URL',
  file: false,
  lines: MCP_URL,
};

/**
 * Whether the docs show the plugin for Claude Code and the extension for Gemini CLI. On since 2026-11-14, when the
 * plugin's repository went public and its install commands started to work.
 */
export const MCP_PLUGIN_DOCS_SHOWN = true;

/** Where the plugin lives, for the links to it. */
export const MCP_PLUGIN_REPO = 'gitranks/contribute';
export const MCP_PLUGIN_REPO_URL = `https://github.com/${MCP_PLUGIN_REPO}`;
/** Where a problem with the plugin or a client's setup is reported. */
export const MCP_PLUGIN_ISSUES_URL = `${MCP_PLUGIN_REPO_URL}/issues`;

/** The plugin's install for one client: the lines, an older client's lines where they differ, and what comes after. */
export type McpDocPlugin = {
  where: string;
  label: string;
  lines: string;
  /** For an older version of the client. */
  older?: { where: string; lines: string };
  /** How it signs in, and what the plugin adds. */
  after: string;
};

/** The plugin installs, by client id: the server plus the contribute skill. */
export const MCP_DOC_PLUGINS: Readonly<Record<string, McpDocPlugin>> = {
  'claude-code': {
    where: 'Run this once (Claude Code 2.1.292 or later).',
    label: 'Terminal',
    lines: `claude plugin install gitranks-contribute --marketplace ${MCP_PLUGIN_REPO}`,
    older: {
      where: 'On an older Claude Code:',
      lines: [
        `claude plugin marketplace add ${MCP_PLUGIN_REPO}`,
        'claude plugin install gitranks-contribute@gitranks',
      ].join('\n'),
    },
    after:
      'Then type /mcp, pick plugin:gitranks-contribute:gitranks and choose Authenticate: your browser opens GitRanks, where you allow it. The plugin adds the contribute skill and the /gitranks-contribute:find and /gitranks-contribute:status commands.',
  },
  'gemini-cli': {
    where: 'Run this once.',
    label: 'Terminal',
    lines: `gemini extensions install ${MCP_PLUGIN_REPO_URL}`,
    after: 'In Gemini CLI, run /mcp auth gitranks: your browser opens GitRanks, where you allow it.',
  },
};

/** The fold that holds a client's plugin install, under its setup. */
export const OR_INSTALL_THE_PLUGIN = 'Or install the plugin';

/** Where the browser goes the first time a client signs in. */
const ALLOW = 'your browser opens GitRanks, where you allow it.';

/**
 * More clients that sign in, docs only (the connect flow does not offer them), each as its own docs say
 * (checked 2026-11-11; ChatGPT 2026-11-14). No token setup: a client here that can't sign in uses "Other clients".
 * ChatGPT has no install link: there is none until our listing is published in its directory.
 */
export const MCP_DOC_MORE_CLIENTS: readonly McpDocClient[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    where: `On chatgpt.com/plugins, press + and choose Add custom MCP server. Name it ${MCP_CONNECTOR_NAME}, paste this URL and set authentication to OAuth. Confirm the warning with I understand and want to continue, press Create as a plugin, then install it. ChatGPT asks you to sign in: ${ALLOW} Then start a new chat and pick it with @.`,
    label: 'MCP server URL',
    file: false,
    lines: MCP_URL,
    after:
      'In ChatGPT, on the web, desktop or your phone, you can find, take and track issues. The fix needs Codex or another agent that can run a shell, signed in to the same account: it picks up the issue you took.',
  },
  {
    id: 'copilot-cli',
    name: 'GitHub Copilot CLI',
    where: `Run this once. Copilot CLI asks you to sign in the first time it uses gitranks: ${ALLOW} To sign in again, run /mcp auth gitranks in Copilot CLI.`,
    label: 'Terminal',
    file: false,
    lines: `copilot mcp add --transport http gitranks ${MCP_URL}`,
  },
  {
    id: 'devin',
    name: 'Devin',
    where: `Run these once with the Devin CLI. The second one signs in: ${ALLOW}`,
    label: 'Terminal',
    file: false,
    lines: [`devin mcp add gitranks ${MCP_URL}`, 'devin mcp login gitranks'].join('\n'),
  },
  {
    id: 'kiro',
    name: 'Kiro',
    where: `Use the Kiro install link, or add this to Kiro's MCP file (.kiro/settings/mcp.json in a workspace). Kiro signs in when it connects: ${ALLOW}`,
    label: '~/.kiro/settings/mcp.json',
    file: true,
    lines: JSON.stringify({ mcpServers: { gitranks: { url: MCP_URL } } }, null, 2),
  },
  {
    id: 'zed',
    name: 'Zed',
    where: `Add this to Zed's settings, or use Settings → AI → MCP Servers → Add Server → Add Remote Server. Zed asks you to sign in: ${ALLOW}`,
    label: 'settings.json',
    file: true,
    lines: JSON.stringify({ context_servers: { gitranks: { url: MCP_URL } } }, null, 2),
  },
  {
    id: 'cline',
    name: 'Cline',
    where: `Add this to Cline's MCP settings. Keep the type: without it, Cline uses an older transport. Then sign in when Cline offers it for gitranks: ${ALLOW}`,
    label: 'cline_mcp_settings.json',
    file: true,
    lines: JSON.stringify(
      { mcpServers: { gitranks: { type: 'streamableHttp', url: MCP_URL, disabled: false, autoApprove: [] } } },
      null,
      2,
    ),
  },
  {
    id: 'opencode',
    name: 'opencode',
    where: `Run these once. The second one signs in: ${ALLOW}`,
    label: 'Terminal',
    file: false,
    lines: [`opencode mcp add gitranks --url ${MCP_URL}`, 'opencode mcp auth gitranks'].join('\n'),
  },
  {
    id: 'amp',
    name: 'Amp',
    where: `Run this once. The next time Amp starts, ${ALLOW}`,
    label: 'Terminal',
    file: false,
    lines: `amp mcp add gitranks ${MCP_URL}`,
  },
];

/** For a client that runs local MCP servers only: the bridge that signs in to ours for it. */
export const MCP_REMOTE_BRIDGE = `npx -y mcp-remote ${MCP_URL} --transport http-only`;

/** The line that saves the token, per OS, with the placeholder in it. */
export const MCP_DOC_SAVES = MCP_OSES.map((os) => ({
  os,
  name: MCP_OS_NAMES[os],
  ...mcpTokenSaveOf(os, TOKEN_PLACEHOLDER),
}));

export { AGENT_FIRST_PROMPT, MCP_TOKEN_ENV, MCP_TOKENS_MAX, MCP_URL };

/** A tool the server offers, as an agent's tool list names it. `changes`: it changes something on GitRanks. */
export type McpDocTool = { name: string; text: string; changes: boolean };

export const MCP_DOC_TOOLS: readonly McpDocTool[] = [
  {
    name: 'find_issues',
    text: 'Open-source issues picked for you, best first, filtered as you ask. Each says whether it can be taken now.',
    changes: false,
  },
  {
    name: 'claim_issue',
    text: "Holds an issue for you after checking it is still free on GitHub, and answers its brief: the repo's rules, what to change and how to test it.",
    changes: true,
  },
  {
    name: 'submit_patch',
    text: 'Hands back your commits as a patch, with a short report. Our checks run at once; then you review and approve the pull request on GitRanks.',
    changes: true,
  },
  {
    name: 'submit_lesson',
    text: 'With GitRanks Learn: hands back the lesson your agent wrote on its fix. You take the lesson on GitRanks, then approve the pull request.',
    changes: true,
  },
  {
    name: 'release_issue',
    text: 'Gives back an issue you took, with why. It is not offered to you again.',
    changes: true,
  },
  {
    name: 'my_contributions',
    text: 'The issues you are working on (the call renews your hold on them), the changes waiting for your review, and your pull requests with their follow-ups.',
    changes: false,
  },
  {
    name: 'start_follow_up',
    text: 'Starts work on reviews, comments or failing checks on one of your open pull requests.',
    changes: true,
  },
  {
    name: 'report_readiness',
    text: 'Records how a repo builds, tests and lints, as your agent found it, for your later briefs alone.',
    changes: true,
  },
  {
    name: 'start_proof',
    text: 'When a review bot asks one of your pull requests for proof that it works (logs, screenshots), holds the proof and answers what to capture.',
    changes: true,
  },
  {
    name: 'submit_proof',
    text: 'Hands back the proof, or why it cannot be proved, with upload links for screenshots.',
    changes: true,
  },
  {
    name: 'finish_proof',
    text: 'Once the screenshots are uploaded: we check them and you see the proof on GitRanks.',
    changes: true,
  },
];

/** The limits per account, as the server counts them. */
export const MCP_DOC_LIMITS: readonly { what: string; limit: string }[] = [
  { what: 'Requests', limit: '300 a minute, every message counted' },
  { what: 'Tool calls', limit: '60 a minute, 1,000 a day' },
  { what: 'find_issues', limit: '20 a minute' },
  {
    what: 'Full issues a day',
    limit:
      'From your GitRanks tier, 10 to 70, plus 5 for each pull request merged through GitRanks, up to 100. Every issue your agent takes counts, refused ones included, together with the issues you see in full on GitRanks and runs on your Claude key',
  },
  { what: 'submit_patch calls', limit: '30 a day, refused ones included, shared with submit_lesson' },
  { what: 'start_proof calls', limit: '20 an hour, renewals included; 3 accepted submissions a day per pull request' },
  {
    what: 'An issue stays held',
    limit:
      '24 hours from the last call that names it; it lapses after 48 hours without a passing patch; 7 days at most',
  },
  { what: 'Personal tokens', limit: `${MCP_TOKENS_MAX} live at once; agents that sign in don't count` },
];

/** The line under the limits. */
export const MCP_DOC_LIMITS_NOTE = 'Under a fair-use warning you can see 5 full issues a day. These limits may change.';

/**
 * What happens once the agent is connected and asked the first prompt (`AGENT_FIRST_PROMPT`), in order. The docs link
 * gitranks.com/contribute in them.
 */
export const MCP_DOC_NEXT_STEPS: readonly string[] = [
  'Your agent shows you a few issues, and you choose one.',
  'It takes the issue, fixes it and submits the patch.',
  'You review and approve the pull request at gitranks.com/contribute. While autopilot is off, nothing reaches GitHub before you approve it.',
  'The first time you approve one, GitHub asks you for one permission.',
];

/** One problem and what to do about it. */
export type McpDocTrouble = { title: string; text: string };

/**
 * Each client the connect flow knows, and where it shows whether gitranks is connected (its sign-in setup's check), then
 * one line for every other client.
 */
export const MCP_DOC_CHECKS: readonly McpDocTrouble[] = [
  ...MCP_CLIENTS.map((client) => ({ title: MCP_CLIENT_NAMES[client], text: mcpSignInSetupOf(client, 'mac').check })),
  {
    title: 'Other clients',
    text: "In your client's MCP or connector settings, gitranks should show as connected. If it doesn't, sign in again from there.",
  },
];

/** The problems every client can have, after each client's own check. */
export const MCP_DOC_TROUBLES: readonly McpDocTrouble[] = [
  {
    title: "Signed in, but your agent says it isn't connected",
    text: 'Reload or restart the client: most read their MCP servers only when they start.',
  },
  {
    title: 'Your agent finds no issues',
    text: `Your first picks take a minute or two after you join. If you picked languages, widen them at gitranks.com${settingsPathOf('work')}.`,
  },
];
