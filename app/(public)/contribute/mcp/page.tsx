import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { McpDocsScreen } from '@/app/contribute/components/mcp-docs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { RULES_PENDING } from '@/lib/workspace/fair-use';
import { AGENTS_DOC_PATH, MCP_DOCS_PATH } from '@/lib/workspace/paths';
import { issueRules } from '@/lib/workspace/rules-live';

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

/** The docs with the limits of the rules the API says hold; the read never fails. */
async function LiveMcpDocs() {
  await connection();
  return <McpDocsScreen rules={await issueRules()} />;
}

/**
 * The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. The limits
 * both rules share at once in the static page, then those of the rules the API says hold.
 */
export default function McpDocsPage() {
  return (
    <Suspense fallback={<McpDocsScreen rules={RULES_PENDING} />}>
      <LiveMcpDocs />
    </Suspense>
  );
}
