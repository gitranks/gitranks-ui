import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';

import { McpDocsScreen } from '../components/mcp-docs';
import { AGENTS_DOC_PATH } from '@/lib/contribute/contribute-path';
import { contributeMcpSignIn } from '@/lib/contribute/mcp-sign-in';

export const metadata: Metadata = {
  title: 'MCP server',
  description:
    'Connect Claude Code, Codex, Cursor, Gemini CLI, Antigravity or VS Code to GitRanks Contribute: setup, tools, the token, limits and what is sent.',
  // The same for agents, in markdown.
  alternates: { types: { 'text/markdown': AGENTS_DOC_PATH } },
};

/**
 * The preview list's until the launch, then every visitor's (the proxy decides); it reads nothing of theirs. The token
 * setup renders at once; once agents sign in with GitHub, the sign-in setup streams in over it.
 */
export default function McpDocsPage() {
  return (
    <Suspense fallback={<McpDocsScreen />}>
      <McpDocs />
    </Suspense>
  );
}

async function McpDocs() {
  // Per request: the flag is read with the clock, which a prerender may not touch.
  await connection();
  return <McpDocsScreen signIn={await contributeMcpSignIn()} />;
}
