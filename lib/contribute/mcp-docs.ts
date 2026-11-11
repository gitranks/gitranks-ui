import {
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
} from './mcp-setup';

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

/**
 * VS Code's Copilot reads the portable MCP file (`mcpServers`): `~/.copilot/mcp-config.json`, or `.mcp.json` at a
 * workspace root. It takes no `${input:…}` prompt (a password input is not forwarded to it, and VS Code marks such a
 * `.vscode/mcp.json` server "Unsupported"), so the header reads the token from the environment like the other
 * clients; VS Code reads the environment when it starts. Checked live in VS Code on 2026-11-07. Docs-only: the
 * connect flow does not offer it yet.
 */
const vsCodeLines = JSON.stringify(
  {
    mcpServers: {
      gitranks: {
        type: 'http',
        url: MCP_URL,
        headers: { Authorization: `Bearer \${${MCP_TOKEN_ENV}}` },
        tools: ['*'],
      },
    },
  },
  null,
  2,
);
const VS_CODE_WHERE =
  "Add this to Copilot's MCP file (%USERPROFILE%\\.copilot\\mcp-config.json on Windows; $COPILOT_HOME/mcp-config.json if you set COPILOT_HOME), or to .mcp.json at your project's root. VS Code reads the token from your environment when it starts, so quit it fully and open it again after you save the token. Then use Agent mode in chat.";
const VS_CODE: McpDocClient = {
  id: 'vs-code',
  name: 'VS Code',
  where: VS_CODE_WHERE,
  label: '~/.copilot/mcp-config.json',
  file: true,
  lines: vsCodeLines,
};

/** The clients the docs show, in the connect flow's order, then VS Code. */
export const MCP_DOC_CLIENTS: readonly McpDocClient[] = [...MCP_CLIENTS.map(connectClientOf), VS_CODE];

/** A client's setup when agents sign in with GitHub: no token, the agent opens GitRanks in the browser to allow it. */
export type McpDocSignIn = Omit<McpDocClient, 'id' | 'name'>;

/** A client the connect flow knows, signing in; null for one that connects with a token only. */
function connectSignInOf(client: McpClient): McpDocSignIn | null {
  const unix = mcpSignInSetupOf(client, 'mac');
  const windows = mcpSignInSetupOf(client, 'windows');
  if (!unix || !windows) return null;
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

/** VS Code's own MCP file, with no header: it asks to sign in when it starts the server. */
const VS_CODE_SIGN_IN: McpDocSignIn = {
  where:
    'Add this with MCP: Open User Configuration (or to .vscode/mcp.json in your project). VS Code asks you to sign in when it starts the server: your browser opens GitRanks, where you allow it. Then use Agent mode in chat.',
  label: 'mcp.json',
  file: true,
  lines: JSON.stringify({ servers: { gitranks: { type: 'http', url: MCP_URL } } }, null, 2),
};

/** Each client's sign-in setup by its id; a client without one (Antigravity) is left out. */
export const MCP_DOC_SIGN_INS: Readonly<Record<string, McpDocSignIn>> = Object.fromEntries([
  ...MCP_CLIENTS.flatMap((client) => {
    const setup = connectSignInOf(client);
    return setup ? [[client, setup] as const] : [];
  }),
  [VS_CODE.id, VS_CODE_SIGN_IN],
]);

/** claude.ai and Claude Desktop: a connector by URL, which can only sign in (it sends no header of ours). */
export const CLAUDE_APP_DOC: McpDocClient = {
  id: 'claude-app',
  name: 'claude.ai and Claude Desktop',
  where:
    'In Claude, open Settings → Connectors → Add custom connector, and paste this URL. Claude opens GitRanks in your browser, where you allow it.',
  label: 'Connector URL',
  file: false,
  lines: MCP_URL,
};

/** The line that saves the token, per OS, with the placeholder in it. */
export const MCP_DOC_SAVES = MCP_OSES.map((os) => ({
  os,
  name: MCP_OS_NAMES[os],
  ...mcpTokenSaveOf(os, TOKEN_PLACEHOLDER),
}));

export { MCP_TOKEN_ENV, MCP_TOKENS_MAX, MCP_URL };

/** A tool the server offers, as an agent's tool list names it. `changes`: it changes something on GitRanks. */
export type McpDocTool = { name: string; text: string; changes: boolean };

export const MCP_DOC_TOOLS: readonly McpDocTool[] = [
  {
    name: 'find_issues',
    text: 'Open-source issues picked for you, best first, filtered as you ask. Each says whether it can be claimed now.',
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
    name: 'release_issue',
    text: 'Gives a claimed issue back, with why. It is not offered to you again.',
    changes: true,
  },
  {
    name: 'my_contributions',
    text: 'Your claims at work (it renews them), the changes waiting for your review, and your pull requests with their follow-ups.',
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
  { what: 'Issues shown for the first time', limit: '150 a day, shared with your feed on GitRanks' },
  { what: 'New claims', limit: '10 a day, refused ones included, shared with runs on your Claude key' },
  { what: 'submit_patch calls', limit: '30 a day, refused ones included' },
  { what: 'start_proof calls', limit: '20 an hour, renewals included; 3 accepted submissions a day per pull request' },
  {
    what: 'A claim lasts',
    limit:
      '24 hours from the last call that names it; it lapses after 48 hours without a passing patch; 7 days at most',
  },
  { what: 'Live tokens', limit: `${MCP_TOKENS_MAX} at once` },
];
