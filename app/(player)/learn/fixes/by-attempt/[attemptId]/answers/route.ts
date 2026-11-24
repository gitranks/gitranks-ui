import { NextResponse } from 'next/server';

import { fixByAttemptRouteGateOf } from '@/lib/learn/fix-gate';
import { SITE_URL } from '@/lib/seo/site';
import { ATTEMPT_ID } from '@/lib/workspace/paths';

/**
 * The fixer's answers by the attempt that made the fix: the link a Learn pull request's footer gives, written before
 * the pull request had a number. The proxy answers this address first (`lib/learn/fix-gate.ts`), since only it can
 * answer the site's own 404 page: a 307 to the answers page (which says when they are kept private), to the
 * walkthrough of a removed fix (its 410 page), or to the page for maintainers when the API cannot be asked. This
 * handler answers the same for a request the proxy let through; nothing there, or an id of another shape, is a 404.
 * Nobody keeps either.
 */
export async function GET(request: Request, { params }: RouteContext<'/learn/fixes/by-attempt/[attemptId]/answers'>) {
  const { attemptId } = await params;
  const gate = ATTEMPT_ID.test(attemptId) ? await fixByAttemptRouteGateOf(attemptId) : null;
  if (gate?.kind !== 'redirect') {
    return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }
  // The site's own address: behind the proxy a route handler's request URL is the server's bind address.
  const response = NextResponse.redirect(new URL(gate.path, SITE_URL || request.url), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
