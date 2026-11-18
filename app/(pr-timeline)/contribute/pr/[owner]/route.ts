import { NextResponse } from 'next/server';

import { prTimelineShortTargetOf } from '@/lib/contribute/pr-timeline-gate';
import { prTimelineRouteOf } from '@/lib/contribute/pr-timeline-path';
import { SITE_URL } from '@/lib/seo/site';

/**
 * The footer's short address, `/contribute/pr/<first attempt id>`: the PR's number is not known while its body is
 * written. Always a 307, never kept: to the page when it is shown, else to the maintainers page about
 * that PR, whatever the reason, so a footer already written keeps working after a page is hidden. Anything that is not
 * an id is a 404.
 */
export async function GET(request: Request, { params }: RouteContext<'/contribute/pr/[owner]'>) {
  const { owner } = await params;
  const route = prTimelineRouteOf(`/contribute/pr/${owner}`);
  if (route?.kind !== 'short') return new NextResponse(null, { status: 404 });
  const target = await prTimelineShortTargetOf(route.attemptId);
  // The site's own address: behind the proxy a route handler's request URL is the server's bind address.
  const response = NextResponse.redirect(new URL(target, SITE_URL || request.url), 307);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
