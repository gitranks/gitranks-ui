import { connection } from 'next/server';

import { loadAgentPage } from '@/lib/contribute/agent-page';
import { agentsDocOf } from '@/lib/contribute/agents-doc';
import { contributeOpen, contributeShown } from '@/lib/contribute/preview-gate';

/**
 * GitRanks Contribute for an AI agent, in markdown: what it gets, the one human step, how to connect, the day's
 * examples. The preview list's until the launch (as the MCP docs), then everyone's; the same text for everyone, so a
 * shared cache may keep it once launched. Indexed.
 */
export async function GET(): Promise<Response> {
  await connection();
  if (!(await contributeShown())) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const [page, open] = await Promise.all([loadAgentPage(), contributeOpen()]);
  return new Response(agentsDocOf(page), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': open ? 'public, max-age=300, s-maxage=300' : 'private, no-store',
      Vary: 'Accept',
    },
  });
}
