import { NextResponse } from 'next/server';

import { SITE_URL } from '@/lib/seo/site';
import { sessionClearsOf } from '@/lib/session-hint';
import { byAttemptTargetOf } from '@/lib/workspace/by-attempt';
import { BY_ATTEMPT_HEADERS, byAttemptPageOf } from '@/lib/workspace/by-attempt-answer';
import { loadAttemptRef, loadIssueAttempt, viewerLogin } from '@/lib/workspace/contribute.data';
import { ATTEMPT_ID } from '@/lib/workspace/paths';

/** A 307 on the site's own address: behind the proxy a route handler's request URL is the server's bind address. */
function redirectTo(target: string, url: URL, cookies: string[] = []) {
  const response = NextResponse.redirect(new URL(target, SITE_URL || url), 307);
  response.headers.set('Cache-Control', BY_ATTEMPT_HEADERS['Cache-Control']);
  for (const cookie of cookies) response.headers.append('Set-Cookie', cookie);
  return response;
}

/** Nowhere to send the browser: the page that says why, with the way back. */
const pageOf = (status: 404 | 503) =>
  new NextResponse(byAttemptPageOf(status), { status, headers: BY_ATTEMPT_HEADERS });

/** The names of the cookies the request carries. */
const cookieNamesOf = (request: Request) =>
  (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.split('=')[0]?.trim() ?? '')
    .filter(Boolean);

/**
 * One attempt's page by its id alone, for the links that know only the id (a list's row, an email, an agent, GitHub's
 * consent coming back): reads the attempt, then its issue's newest attempt, and sends the browser on to the pull
 * request's page by repo and issue (or the earlier attempt's, or the run's session under it), the query kept. A visitor
 * without a session never gets here: the proxy shows them the sign-in on this same address. An attempt that is not the
 * viewer's, or a malformed id, is a 404 page; an API that does not answer, a 503 page.
 */
export async function GET(request: Request, { params }: RouteContext<'/my/pull-requests/by-attempt/[attemptId]'>) {
  const { attemptId } = await params;
  const url = new URL(request.url);
  if (!ATTEMPT_ID.test(attemptId)) return pageOf(404);
  if (!(await viewerLogin())) {
    // A session the server can no longer read (the proxy's own ask let it through): dropped, and the same address
    // asked again, its query whole (a grant's `?resume=`), so the proxy shows the sign-in there and it comes back.
    const clears = sessionClearsOf(cookieNamesOf(request));
    return clears.length ? redirectTo(`${url.pathname}${url.search}`, url, clears) : pageOf(404);
  }
  const attempt = await loadAttemptRef(attemptId);
  if (attempt === undefined) return pageOf(503);
  if (!attempt?.nameWithOwner) return pageOf(404);
  const [owner = '', repo = ''] = attempt.nameWithOwner.split('/');
  const issue = await loadIssueAttempt(owner, repo, attempt.number);
  if (issue === undefined) return pageOf(503);
  const target = byAttemptTargetOf(attempt, issue, url.searchParams);
  return target ? redirectTo(target, url) : pageOf(404);
}
