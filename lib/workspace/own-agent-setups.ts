import { type McpInstallLink, mcpInstallLinkOf } from './mcp-install-links';
import { MCP_SETUPS, MCP_SIGN_IN_SETUPS, MCP_TOKEN_ENV, MCP_URL } from './mcp-setup';

/**
 * VS Code's Copilot reads the portable MCP file (`mcpServers`): `~/.copilot/mcp-config.json`, or `.mcp.json` at a
 * workspace root. It takes no `${input:…}` prompt (a password input is not forwarded to it, and VS Code marks such a
 * `.vscode/mcp.json` server "Unsupported"), so the header reads the token from the environment like the other
 * clients; VS Code reads the environment when it starts. Checked live in VS Code on 2026-11-07. The connect flow does
 * not offer it yet: the MCP docs and Settings do.
 */
export const VS_CODE_TOKEN_LINES = JSON.stringify(
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
export const VS_CODE_TOKEN_FILE = '~/.copilot/mcp-config.json';
export const VS_CODE_TOKEN_WHERE =
  "Add this to Copilot's MCP file (%USERPROFILE%\\.copilot\\mcp-config.json on Windows; $COPILOT_HOME/mcp-config.json if you set COPILOT_HOME), or to .mcp.json at your project's root. VS Code reads the token from your environment when it starts, so quit it fully and open it again after you save the token. Then use Agent mode in chat.";

/** VS Code's own MCP file, with no header: it asks to sign in when it starts the server. */
export const VS_CODE_SIGN_IN = {
  where:
    'Add this with MCP: Open User Configuration (or to .vscode/mcp.json in your project). VS Code asks you to sign in when it starts the server: your browser opens GitRanks, where you allow it. Then use Agent mode in chat.',
  label: 'mcp.json',
  file: true,
  lines: JSON.stringify({ servers: { gitranks: { type: 'http', url: MCP_URL } } }, null, 2),
};

/** A client in Settings' "Set up your agent" picker: its token setup, and its setup when agents sign in. */
export type OwnAgentSetup = {
  id: string;
  name: string;
  /** `file`: the file it goes in, where `where` does not name it. */
  token: { where: string; lines: string; file?: string };
  signIn: { where: string; label: string; file: boolean; lines: string };
  /** Its one-click install, where it has one: it adds the server with no token, so it shows when agents sign in. */
  install?: McpInstallLink;
};

/** The clients Settings offers: the connect flow's, then VS Code. The MCP docs show the same lines. */
export const OWN_AGENT_SETUPS: readonly OwnAgentSetup[] = [
  ...MCP_SETUPS.map((setup) => ({
    id: setup.client,
    name: setup.name,
    token: setup,
    signIn: MCP_SIGN_IN_SETUPS.find(({ client }) => client === setup.client) ?? MCP_SIGN_IN_SETUPS[0],
  })),
  {
    id: 'vs-code',
    name: 'VS Code',
    token: { where: VS_CODE_TOKEN_WHERE, lines: VS_CODE_TOKEN_LINES, file: VS_CODE_TOKEN_FILE },
    signIn: VS_CODE_SIGN_IN,
  },
].map((setup) => ({ ...setup, install: mcpInstallLinkOf(setup.id) }));
