import type { Metadata } from 'next';

import { McpDocsScreen } from '../components/mcp-docs';
import { AGENTS_DOC_PATH } from '@/lib/contribute/contribute-path';

export const metadata: Metadata = {
  title: 'MCP server',
  description:
    'Connect Claude Code, Codex, Cursor, Gemini CLI, VS Code, claude.ai, Kiro and more to GitRanks Contribute: one-click links, sign in with GitHub or use a token, the tools, limits and what is sent.',
  // The same for agents, in markdown.
  alternates: { types: { 'text/markdown': AGENTS_DOC_PATH } },
};

/** The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. */
export default function McpDocsPage() {
  return <McpDocsScreen />;
}
