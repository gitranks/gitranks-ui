import { connection, type NextRequest } from 'next/server';

import { isOwnView } from '@/lib/learn/issues';
import { issuesNamesOf, loadIssuesListPublic, loadLearnFixes } from '@/lib/learn/issues.data';
import { learnIssuesMarkdownResponse, markdownViewOf } from '@/lib/learn/issues-markdown';

/**
 * The Markdown copy of Issues and of a lesson's and a course's view of it, for agents: the proxy answers
 * `/learn/issues.md` and the views' `…/real-world.md` from here, a view's with its merged fixes. Asked per request: the
 * list changes through the day.
 */
export async function GET(request: NextRequest) {
  await connection();
  const { view, at } = markdownViewOf(request.nextUrl.searchParams);
  const own = at !== 'issues' && isOwnView(view, at);
  return learnIssuesMarkdownResponse(
    async () => {
      const [list, names, fixes] = await Promise.all([
        loadIssuesListPublic(view),
        issuesNamesOf(view),
        own ? loadLearnFixes(view) : null,
      ]);
      return {
        rows: list.kind === 'ok' ? list.data.rows : null,
        failed: list.kind === 'failed' || fixes?.kind === 'failed',
        names,
        ...(fixes ? { fixes: fixes.kind === 'ok' ? fixes.data : null } : {}),
      };
    },
    view,
    at,
  );
}
