import { connection, type NextRequest } from 'next/server';

import { fixCardResponse } from '@/components/learn/share/fix-card-response';
import { loadFixCard } from '@/lib/learn/fix-share.data';
import { parsePrLink } from '@/lib/workspace/pr-feedback';

/**
 * The picture a posted link to a fix shows, beside its "How it was made" page. The proxy asks the API about the page
 * first, as for the page and its Markdown copy, so the picture answers exactly when the page does. Answered on
 * request; the fix comes from a cached read under its tag.
 */
export async function GET(
  req: NextRequest,
  { params }: RouteContext<'/contribute/pr/[owner]/[repo]/[number]/card.png'>,
) {
  await connection();
  const { owner, repo, number } = await params;
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  return fixCardResponse(
    pr && String(pr.number) === number ? pr : null,
    req.nextUrl.pathname,
    req.nextUrl.search,
    loadFixCard,
  );
}
