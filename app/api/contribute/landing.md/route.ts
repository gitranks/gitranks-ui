import { connection } from 'next/server';

import { loadAgentPage } from '@/lib/contribute/agent-page';
import { contributeLandingDocOf } from '@/lib/contribute/landing-doc';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeOpen, contributeShown } from '@/lib/workspace/preview-gate';

/** The copy with the day's numbers, or without them when they can't be drawn: it never fails on them. */
function docOf(stats: Parameters<typeof contributeLandingDocOf>[0]): string {
  try {
    return contributeLandingDocOf(stats);
  } catch {
    return contributeLandingDocOf(null);
  }
}

/**
 * Contribute's landing in Markdown, for agents: the proxy answers `/contribute.md` from here. Shown to whoever may see
 * Contribute, like the page for AI agents; once launched a shared cache may keep it. A copy of the landing, so never
 * indexed apart from it: it names the landing as canonical, as Learn's copies do.
 */
export async function GET(): Promise<Response> {
  await connection();
  if (!(await contributeShown())) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const [page, open] = await Promise.all([loadAgentPage(), contributeOpen(Date.now())]);
  return new Response(docOf(page?.stats), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
      Link: `<${WORKSPACE_PATHS.contribute}>; rel="canonical"`,
      'Cache-Control': open ? 'public, max-age=300, s-maxage=300' : 'private, no-store',
    },
  });
}
