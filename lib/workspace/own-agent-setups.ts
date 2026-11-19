import { MCP_TOKEN_ENV, MCP_URL } from './mcp-setup';

/**
 * VS Code's Copilot reads the portable MCP file (`mcpServers`): `~/.copilot/mcp-config.json`, or `.mcp.json` at a
 * workspace root. It takes no `${input:…}` prompt (a password input is not forwarded to it, and VS Code marks such a
 * `.vscode/mcp.json` server "Unsupported"), so the header reads the token from the environment like the other
 * clients; VS Code reads the environment when it starts. Checked live in VS Code on 2026-11-07. The connect flow does
 * not offer it yet: the MCP docs do.
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
