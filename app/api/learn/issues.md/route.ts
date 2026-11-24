import { connection, type NextRequest } from 'next/server';

import { issuesNamesOf, loadIssuesListPublic } from '@/lib/learn/issues.data';
import { learnIssuesMarkdownResponse, markdownViewOf } from '@/lib/learn/issues-markdown';

/**
 * The Markdown copy of Issues and of a lesson's and a course's view of it, for agents: the proxy answers
 * `/learn/issues.md` and the views' `…/real-world.md` from here. Asked per request: the list changes through the day.
 */
export async function GET(request: NextRequest) {
  await connection();
  const { view, at } = markdownViewOf(request.nextUrl.searchParams);
  return learnIssuesMarkdownResponse(
    async () => {
      const [list, names] = await Promise.all([loadIssuesListPublic(view), issuesNamesOf(view)]);
      return { rows: list.kind === 'ok' ? list.data.rows : null, failed: list.kind === 'failed', names };
    },
    view,
    at,
  );
}
