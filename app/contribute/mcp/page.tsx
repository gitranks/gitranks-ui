import type { Metadata } from 'next';

import { McpDocsScreen } from '../components/mcp-docs';
import { AGENTS_DOC_PATH, MCP_DOCS_PATH } from '@/lib/contribute/contribute-path';
import { pageMetadata } from '@/lib/seo/page-metadata';

const page = pageMetadata({
  title: { absolute: 'MCP server · GitRanks Contribute' },
  description:
    'Connect your own coding agent to GitRanks Contribute: one-click setup for Claude, Cursor, VS Code and Kiro, sign-in lines for Claude Code, Codex, Gemini CLI and more, the tools and limits.',
  path: MCP_DOCS_PATH,
});

export const metadata: Metadata = {
  ...page,
  // The same for agents, in markdown.
  alternates: { ...page.alternates, types: { 'text/markdown': AGENTS_DOC_PATH } },
};

/** The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. */
export default function McpDocsPage() {
  return <McpDocsScreen />;
}
