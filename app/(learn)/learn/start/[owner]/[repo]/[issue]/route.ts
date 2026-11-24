import { NextResponse } from 'next/server';

import { SITE_URL } from '@/lib/seo/site';
import { loadStartPageWithMask } from '@/lib/workspace/masked-issue.data';
import { PICK_ISSUE_PATHS, startPath } from '@/lib/workspace/paths';
import { learnStartIssueOf } from '@/lib/workspace/start/start-page';

/**
 * The old start address of an issue under Learn's flow, `/learn/start/<owner>/<repo>/<issue>`, which the flow is gone
 * from. It depends on the person, so it is always a 307, never kept: an issue the signed-in person holds or works on
 * goes to its Start page (`?from=learn`; the Start page sends one they work on to its pull request's page), anything
 * else to Learn's Issues, which never names an issue nobody uncovered. A failed read goes to Issues too. Anything that
 * is not an issue's address is a 404.
 */
export async function GET(request: Request, { params }: RouteContext<'/learn/start/[owner]/[repo]/[issue]'>) {
  const { owner, repo, issue } = await params;
  const named = learnStartIssueOf(owner, repo, issue);
  if (!named) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  const ref = { repo: named.repo, issue: named.number };
  const read = await loadStartPageWithMask(ref, 'fix').catch(() => null);
  // Worked on by the person (an attempt of theirs), or held or named by them (the read gives no mask): theirs. An issue
  // with a mask and no attempt of theirs is uncovered by nobody, so its address is not followed.
  const answer = read?.answer;
  const theirs = answer?.ok === true && (answer.data.refusal === 'YOURS' || read?.maskId === null);
  const target = theirs ? startPath(ref, { from: 'learn' }) : PICK_ISSUE_PATHS.learn;
  // The site's own address: behind the proxy a route handler's request URL is the server's bind address.
  const response = NextResponse.redirect(new URL(target, SITE_URL || request.url), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
