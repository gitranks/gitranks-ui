import { connection } from 'next/server';

import { loadAgentPage } from '@/lib/contribute/agent-page';
import { agentsDocOf } from '@/lib/contribute/agents-doc';
import { contributeOpen, contributeShown } from '@/lib/workspace/preview-gate';
import { issueRules } from '@/lib/workspace/rules-live';

/**
 * GitRanks Contribute for an AI agent, in markdown: what it gets, the one human step, how to connect, the day's
 * examples, the limits of the rules the API says hold (today's when it does not know the read; when it does not
 * answer, the limits both rules share and a line that says so, kept by no cache). The preview list's until the launch
 * (as the MCP docs), then everyone's; the same text for everyone, so a shared cache may keep it once launched. Indexed.
 */
export async function GET(): Promise<Response> {
  await connection();
  if (!(await contributeShown())) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const [page, open, rules] = await Promise.all([loadAgentPage(), contributeOpen(Date.now()), issueRules()]);
  return new Response(agentsDocOf(page, { rules }), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': open && rules.state !== 'unknown' ? 'public, max-age=300, s-maxage=300' : 'private, no-store',
      Vary: 'Accept',
    },
  });
}
