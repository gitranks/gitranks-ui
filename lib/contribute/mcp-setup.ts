/** The longest name a token may have, and the longest note sent back to the user's own agent. */
/** What the user's own agent does with us, under its title. */
export const OWN_AGENT_TEXT =
  'Claude Code, Codex, Cursor or Gemini CLI on your machine finds issues here, works on one and hands the change back through our MCP server. You still review and approve every pull request here. Your agent and its model are your own: no Claude key is needed.';

export const MCP_TOKEN_NAME_MAX = 40;
export const SEND_BACK_NOTE_MAX = 2_000;
/** Live tokens a user may hold at once. Creating one never revokes the others. */
export const MCP_TOKENS_MAX = 5;
/** Where the user's own agent connects. */
export const MCP_URL = 'https://mcp.gitranks.com/mcp';
/** The environment variable every setup line reads the token from, so the token never sits in a config file. */
export const MCP_TOKEN_ENV = 'GITRANKS_MCP_TOKEN';

export type McpClient = 'claude-code' | 'codex' | 'cursor' | 'gemini-cli';

/** The clients we have setup for, in the order the pickers list them. */
export const MCP_CLIENTS: readonly McpClient[] = ['claude-code', 'codex', 'cursor', 'gemini-cli'];

export const MCP_CLIENT_NAMES: Record<McpClient, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex CLI',
  cursor: 'Cursor',
  'gemini-cli': 'Gemini CLI',
};

/** One of our clients, from a query parameter or anything else untrusted. */
export const isMcpClient = (value: unknown): value is McpClient =>
  typeof value === 'string' && (MCP_CLIENTS as readonly string[]).includes(value);

/** The computer the token is saved on: the save line and the config paths differ. */
export type McpOs = 'mac' | 'linux' | 'windows';

export const MCP_OSES: readonly McpOs[] = ['mac', 'linux', 'windows'];

export const MCP_OS_NAMES: Record<McpOs, string> = { mac: 'macOS', linux: 'Linux', windows: 'Windows' };

/** What the browser says of the computer it runs on. */
export type NavigatorLike = { userAgentData?: { platform?: string } | null; userAgent?: string | null };

/**
 * The user's computer, as the browser tells it: the client hints' platform when there is one, else the user agent.
 * A phone, a tablet or anything unknown is macOS, the most common computer an agent runs on.
 */
export function mcpOsOf(browser: NavigatorLike | null | undefined): McpOs {
  const said = `${browser?.userAgentData?.platform ?? ''} ${browser?.userAgent ?? ''}`.toLowerCase();
  if (/android/.test(said)) return 'mac';
  if (/windows|\bwin(?:32|64)\b/.test(said)) return 'windows';
  if (/linux|\bcros\b|chrome os|x11/.test(said)) return 'linux';
  return 'mac';
}

/** The name a token gets for us, "{client} on {OS}". */
export const mcpTokenNameOf = (client: McpClient, os: McpOs): string =>
  `${MCP_CLIENT_NAMES[client]} on ${MCP_OS_NAMES[os]}`.slice(0, MCP_TOKEN_NAME_MAX);

/** The line that puts the token in the environment, for the shell profile. */
export const exportLineOf = (token: string): string => `export ${MCP_TOKEN_ENV}="${token}"`;

/** Where a token is saved, as one line the user pastes. */
export type McpTokenSave = {
  /** The header of the block: where the line is pasted. */
  shell: 'Terminal' | 'PowerShell';
  line: string;
  note: string;
};

const PROFILES: Record<Exclude<McpOs, 'windows'>, string> = { mac: '~/.zshrc', linux: '~/.bashrc' };

/** The one line that saves the token on this computer, the token in it. */
export function mcpTokenSaveOf(os: McpOs, token: string): McpTokenSave {
  if (os === 'windows') {
    return {
      shell: 'PowerShell',
      line: `[Environment]::SetEnvironmentVariable("${MCP_TOKEN_ENV}", "${token}", "User")`,
      note: 'Paste it in PowerShell. It saves the token for your Windows user. Open a new PowerShell window afterwards.',
    };
  }
  const profile = PROFILES[os];
  return {
    shell: 'Terminal',
    line: `echo '${exportLineOf(token)}' >> ${profile} && source ${profile}`,
    note:
      os === 'mac'
        ? 'Paste it in Terminal. It adds the token to your zsh profile and loads it right away.'
        : 'Paste it in your terminal. It adds the token to your bash profile and loads it right away. On zsh, use ~/.zshrc instead.',
  };
}

/** The same, by hand: nothing pasted in a shell, so nothing lands in its history. */
export type McpTokenByHand = { steps: string; line?: string };

export function mcpTokenByHandOf(os: McpOs, token: string): McpTokenByHand {
  if (os === 'windows') {
    return {
      steps: `Open Settings, search for "environment variables" and choose "Edit environment variables for your account". Add a new variable named ${MCP_TOKEN_ENV}, with the token as its value, then open a new PowerShell window.`,
    };
  }
  return {
    steps: `Open ${PROFILES[os]} in an editor, add this line at the end and save it. Then open a new terminal.`,
    line: exportLineOf(token),
  };
}

/** How to check the variable is set, in the shell the agent runs in. */
export const mcpTokenCheckOf = (os: McpOs): string =>
  os === 'windows' ? `echo $env:${MCP_TOKEN_ENV}` : `echo $${MCP_TOKEN_ENV}`;

/** The lines that add GitRanks to a client, reading the token from the environment, in the OS's form. */
export function mcpSetupLinesOf(client: McpClient, os: McpOs): string {
  switch (client) {
    case 'claude-code': {
      const variable = os === 'windows' ? `$env:${MCP_TOKEN_ENV}` : `$${MCP_TOKEN_ENV}`;
      return `claude mcp add --scope user --transport http gitranks ${MCP_URL} --header "Authorization: Bearer ${variable}"`;
    }
    case 'codex':
      return [`[mcp_servers.gitranks]`, `url = "${MCP_URL}"`, `bearer_token_env_var = "${MCP_TOKEN_ENV}"`].join('\n');
    case 'cursor':
      return JSON.stringify(
        { mcpServers: { gitranks: { url: MCP_URL, headers: { Authorization: `Bearer \${env:${MCP_TOKEN_ENV}}` } } } },
        null,
        2,
      );
    case 'gemini-cli':
      return JSON.stringify(
        { mcpServers: { gitranks: { httpUrl: MCP_URL, headers: { Authorization: `Bearer $${MCP_TOKEN_ENV}` } } } },
        null,
        2,
      );
  }
}

const CONFIG_FILES: Record<Exclude<McpClient, 'claude-code'>, string[]> = {
  codex: ['.codex', 'config.toml'],
  cursor: ['.cursor', 'mcp.json'],
  'gemini-cli': ['.gemini', 'settings.json'],
};

/** A config file under the user's home, in the OS's spelling. */
const homePathOf = (os: McpOs, parts: string[]) =>
  os === 'windows' ? `%USERPROFILE%\\${parts.join('\\')}` : `~/${parts.join('/')}`;

/** A client's setup on one OS, as the own-agent path shows it. */
export type McpClientSetup = {
  client: McpClient;
  name: string;
  /** The header of the block: the shell to run it in, or the file to add it to. */
  label: string;
  /** The label is a path. */
  file: boolean;
  /** What to do with the lines. */
  where: string;
  lines: string;
};

/**
 * The line that drops Claude Code's GitRanks entry, its error silenced when there is none: Claude Code keeps the token
 * it read when the entry was added, and refuses to add a name it holds already.
 */
export const claudeCodeRemoveOf = (os: McpOs): string =>
  `claude mcp remove --scope user gitranks ${os === 'windows' ? '2>$null' : '2>/dev/null'}`;

/**
 * A client's setup on one OS. `replacing`: the token replaces one the agent may hold already, so Claude Code's entry
 * is removed before it is added again, and the clients that read the variable when they start are restarted.
 */
export function mcpClientSetupOf(
  client: McpClient,
  os: McpOs,
  { replacing = false }: { replacing?: boolean } = {},
): McpClientSetup {
  const lines = mcpSetupLinesOf(client, os);
  const name = MCP_CLIENT_NAMES[client];
  if (client === 'claude-code') {
    // On Windows the saved variable reaches new windows only.
    const run =
      os === 'windows' ? 'Run this once, in a new PowerShell window.' : 'Run this once, in the same terminal.';
    return {
      client,
      name,
      label: os === 'windows' ? 'PowerShell' : 'Terminal',
      file: false,
      where: replacing
        ? `${run} It removes the GitRanks entry Claude Code has, which keeps the old token, then adds it again.`
        : `${run} It works in every project.`,
      lines: replacing ? `${claudeCodeRemoveOf(os)}; ${lines}` : lines,
    };
  }
  const where = {
    codex: 'Add this to the Codex config file.',
    // A Cursor started from the dock does not read the shell profile; Windows hands it the saved variable.
    cursor:
      os === 'windows'
        ? 'Add this to the Cursor MCP file, then restart Cursor.'
        : 'Add this to the Cursor MCP file, then start Cursor again from a terminal, so it sees the variable.',
    'gemini-cli': 'Add this to the Gemini CLI settings file.',
  }[client];
  const restart =
    replacing && client !== 'cursor' ? ` If ${name} is running, restart it, so it reads the new token.` : '';
  return { client, name, label: homePathOf(os, CONFIG_FILES[client]), file: true, where: where + restart, lines };
}

export type McpSetup = {
  client: McpClient;
  name: string;
  /** Where the lines go: a shell, or a config file, and what to know about the token there. */
  where: string;
  lines: string;
};

const SETTINGS_WHERE: Record<McpClient, string> = {
  'claude-code': 'In a terminal, with the variable set: Claude Code keeps the token it reads then',
  codex: '~/.codex/config.toml',
  cursor: '~/.cursor/mcp.json (start Cursor from a shell that has the variable)',
  'gemini-cli': '~/.gemini/settings.json',
};

/**
 * Ready-made setup for each client, as Settings lists it, checked against each client's own docs: every one reads the
 * token from `GITRANKS_MCP_TOKEN`. Claude Code's shell expands it once, when the server is added for every project
 * (`--scope user`), and Claude Code keeps the token in its own config; the other three read the variable each time
 * they start.
 */
export const MCP_SETUPS: readonly McpSetup[] = MCP_CLIENTS.map((client) => ({
  client,
  name: MCP_CLIENT_NAMES[client],
  where: SETTINGS_WHERE[client],
  lines: mcpSetupLinesOf(client, 'mac'),
}));
