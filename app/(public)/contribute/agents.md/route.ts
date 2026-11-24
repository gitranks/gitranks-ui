import { connection } from 'next/server';

import { loadAgentPage } from '@/lib/contribute/agent-page';
import type { AgentPage } from '@/lib/contribute/agent-page.types';
import { agentsDocOf } from '@/lib/contribute/agents-doc';
import { contributeOpen, contributeShown } from '@/lib/workspace/preview-gate';

/** The page with the day's numbers and examples, or without them when they can't be drawn: it never fails on them. */
function docOf(page: AgentPage | null): string {
  try {
    return agentsDocOf(page);
  } catch {
    return agentsDocOf(null);
  }
}

/**
 * GitRanks Contribute for an AI agent, in markdown: what it gets, the one human step, how to connect, the day's
 * examples, the limits. The preview list's until the launch (as the MCP docs), then everyone's; the same text for
 * everyone, so a shared cache may keep it once launched. Indexed.
 */
export async function GET(): Promise<Response> {
  await connection();
  if (!(await contributeShown())) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const [page, open] = await Promise.all([loadAgentPage(), contributeOpen(Date.now())]);
  return new Response(docOf(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': open ? 'public, max-age=300, s-maxage=300' : 'private, no-store',
      Vary: 'Accept',
    },
  });
}
