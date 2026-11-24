import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { McpDocsScreen } from '@/app/contribute/components/mcp-docs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { AGENTS_DOC_PATH, MCP_DOCS_PATH } from '@/lib/workspace/paths';
import { issueRulesLive } from '@/lib/workspace/rules-live';

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

/** The docs with the limits the API says are live; the read never fails (today's limits when unknown). */
async function LiveMcpDocs() {
  await connection();
  return <McpDocsScreen rulesLive={await issueRulesLive()} />;
}

/**
 * The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. Today's
 * limits at once, then those the API says are live.
 */
export default function McpDocsPage() {
  return (
    <Suspense fallback={<McpDocsScreen />}>
      <LiveMcpDocs />
    </Suspense>
  );
}
