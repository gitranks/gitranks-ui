/** The longest name a token may have, and the longest note sent back to the user's own agent. */
export const MCP_TOKEN_NAME_MAX = 40;
export const SEND_BACK_NOTE_MAX = 2_000;
/** How many times a change may be sent back to the agent. */
export const SEND_BACKS_MAX = 3;

/** Where the user's own agent connects. */
export const MCP_URL = 'https://mcp.gitranks.com/mcp';
/** The environment variable every setup line reads the token from, so the token never sits in a config file. */
export const MCP_TOKEN_ENV = 'GITRANKS_MCP_TOKEN';

export type McpClient = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli';

export type McpSetup = {
  client: McpClient;
  name: string;
  /** Where the lines go: a shell, or a config file. */
  where: string;
  lines: string;
};

/**
 * Ready-made setup for each client, checked against each client's own docs: every one reads the token from
 * `GITRANKS_MCP_TOKEN` (Claude Code's shell expands it once, when the server is added).
 */
export const MCP_SETUPS: readonly McpSetup[] = [
  {
    client: 'claude-code',
    name: 'Claude Code',
    where: 'In a terminal',
    lines: `claude mcp add --transport http gitranks ${MCP_URL} --header "Authorization: Bearer $${MCP_TOKEN_ENV}"`,
  },
  {
    client: 'codex',
    name: 'Codex CLI',
    where: '~/.codex/config.toml',
    lines: [`[mcp_servers.gitranks]`, `url = "${MCP_URL}"`, `bearer_token_env_var = "${MCP_TOKEN_ENV}"`].join('\n'),
  },
  {
    client: 'cursor',
    name: 'Cursor',
    where: '~/.cursor/mcp.json',
    lines: JSON.stringify(
      {
        mcpServers: {
          gitranks: { url: MCP_URL, headers: { Authorization: `Bearer \${env:${MCP_TOKEN_ENV}}` } },
        },
      },
      null,
      2,
    ),
  },
  {
    client: 'gemini-cli',
    name: 'Gemini CLI',
    where: '~/.gemini/settings.json',
    lines: JSON.stringify(
      {
        mcpServers: {
          gitranks: { httpUrl: MCP_URL, headers: { Authorization: `Bearer $${MCP_TOKEN_ENV}` } },
        },
      },
      null,
      2,
    ),
  },
];

/** The line that puts the token in the environment, for the shell profile. */
export const exportLineOf = (token: string): string => `export ${MCP_TOKEN_ENV}="${token}"`;
