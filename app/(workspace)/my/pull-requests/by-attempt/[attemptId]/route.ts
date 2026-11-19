import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';

import { SITE_URL } from '@/lib/seo/site';
import { byAttemptTargetOf } from '@/lib/workspace/by-attempt';
import { loadAttemptRef, loadIssueAttempt, viewerLogin } from '@/lib/workspace/contribute.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Never kept by a cache: the address answers per viewer. */
const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** A 307 on the site's own address: behind the proxy a route handler's request URL is the server's bind address. */
function redirectTo(target: string, url: URL) {
  const response = NextResponse.redirect(new URL(target, SITE_URL || url), 307);
  response.headers.set('Cache-Control', PRIVATE['Cache-Control']);
  return response;
}

/** The API did not answer: reloading asks again. */
const unread = () =>
  new NextResponse("This page didn't load. Reload to try again.", {
    status: 503,
    headers: { ...PRIVATE, 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '5' },
  });

/**
 * One attempt's page by its id alone, for the links that know only the id (a list's row, an email, an agent, GitHub's
 * consent coming back): reads the attempt, then its issue's newest attempt, and sends the browser on to the pull
 * request's page by repo and issue (or the earlier attempt's, or the run's session under it), the query kept. A visitor
 * without a session never gets here: the proxy shows them the sign-in on this same address. An attempt that is not the
 * viewer's, or has no page, is a 404.
 */
export async function GET(request: Request, { params }: RouteContext<'/my/pull-requests/by-attempt/[attemptId]'>) {
  const { attemptId } = await params;
  const url = new URL(request.url);
  // A session that ended between the proxy and here: the workspace's sign-in.
  if (!(await viewerLogin())) return redirectTo(WORKSPACE_PATHS.pullRequests, url);
  const attempt = await loadAttemptRef(attemptId);
  if (attempt === undefined) return unread();
  if (!attempt?.nameWithOwner) notFound();
  const [owner = '', repo = ''] = attempt.nameWithOwner.split('/');
  const issue = await loadIssueAttempt(owner, repo, attempt.number);
  if (issue === undefined) return unread();
  const target = byAttemptTargetOf(attempt, issue, url.searchParams);
  if (!target) notFound();
  return redirectTo(target, url);
}
