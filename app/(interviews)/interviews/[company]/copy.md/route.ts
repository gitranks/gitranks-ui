import { interviewCompanyMarkdownResponse } from '@/lib/interviews/markdown-response';
import { loadInterviewCompanyShare } from '@/lib/interviews/share.data';

/**
 * A company's Markdown copy, for agents: the proxy answers `/interviews/<company>.md` from here, since a page and a
 * route handler cannot share the `[company]` segment.
 */
export async function GET(_request: Request, { params }: RouteContext<'/interviews/[company]/copy.md'>) {
  const { company } = await params;
  return interviewCompanyMarkdownResponse(() => loadInterviewCompanyShare(company));
}
