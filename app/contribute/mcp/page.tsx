import type { Metadata } from 'next';

import { McpDocsScreen } from '../components/mcp-docs';

export const metadata: Metadata = {
  title: 'MCP server',
  description:
    'Connect Claude Code, Codex, Cursor, Gemini CLI, Antigravity or VS Code to GitRanks Contribute: setup, tools, the token, limits and what is sent.',
};

/** The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. */
export default function McpDocsPage() {
  return <McpDocsScreen />;
}
