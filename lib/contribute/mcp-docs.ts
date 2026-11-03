import {
  MCP_CLIENTS,
  MCP_OS_NAMES,
  MCP_OSES,
  MCP_TOKEN_ENV,
  MCP_TOKENS_MAX,
  MCP_URL,
  type McpClient,
  mcpClientSetupOf,
  mcpTokenSaveOf,
} from './mcp-setup';

/** What the docs put where a token goes: never a real one. */
export const TOKEN_PLACEHOLDER = '<your GitRanks token>';

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
  /** Where Windows differs: the block's header and lines there. */
  windows?: { label: string; lines: string };
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
      windows.label !== unix.label || windows.lines !== unix.lines
        ? { label: windows.label, lines: windows.lines }
        : undefined,
  };
}

/**
 * VS Code asks for the token once and keeps it in its own secret storage (an `inputs` entry with `password: true`),
 * so nothing is saved in the environment or the file. Docs-only: the connect flow does not offer it yet.
 */
const VS_CODE: McpDocClient = {
  id: 'vs-code',
  name: 'VS Code',
  where:
    'Add this to your user MCP file (Command Palette → "MCP: Open User Configuration") or to .vscode/mcp.json. VS Code asks for the token the first time it starts the server.',
  label: 'mcp.json',
  file: true,
  lines: JSON.stringify(
    {
      inputs: [{ type: 'promptString', id: 'gitranks-token', description: 'GitRanks token', password: true }],
      servers: {
        gitranks: { type: 'http', url: MCP_URL, headers: { Authorization: `Bearer \${input:gitranks-token}` } },
      },
    },
    null,
    2,
  ),
};

/** The clients the docs show, in the connect flow's order, then VS Code. Antigravity joins when its setup is chosen. */
export const MCP_DOC_CLIENTS: readonly McpDocClient[] = [...MCP_CLIENTS.map(connectClientOf), VS_CODE];

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
