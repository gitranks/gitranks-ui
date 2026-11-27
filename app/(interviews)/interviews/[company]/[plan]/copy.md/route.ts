import { interviewPlanMarkdownResponse } from '@/lib/interviews/markdown-response';
import { loadInterviewPlanShare } from '@/lib/interviews/share.data';

/**
 * A plan's Markdown copy, for agents: the proxy answers `/interviews/<company>/<plan>.md` from here, since a page and
 * a route handler cannot share the `[plan]` segment.
 */
export async function GET(_request: Request, { params }: RouteContext<'/interviews/[company]/[plan]/copy.md'>) {
  const { company, plan } = await params;
  return interviewPlanMarkdownResponse(() => loadInterviewPlanShare(company, plan));
}
