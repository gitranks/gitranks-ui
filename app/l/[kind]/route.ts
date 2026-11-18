import { type NextRequest, NextResponse } from 'next/server';

import { LINK_COOKIE_MAX_AGE_SEC, LINK_PAGE_HEADERS, linkCookie, linkLandingOf } from '@/lib/link-token/link-token';

/**
 * Where a link in our email lands: `/l/<kind>?t=<token>`. It changes nothing. The token goes into the kind's cookie
 * and the browser goes on to the kind's page, whose address holds no token. A link without a usable token clears the
 * cookie and sends the browser to the page with `?e=invalid`, so the page says the link does not work rather than
 * showing an older one or saying it timed out. The token is never logged.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/l/[kind]'>) {
  const landing = linkLandingOf((await params).kind, request.nextUrl.searchParams.get('t'));
  if (!landing) {
    return new NextResponse('Not found', { status: 404, headers: LINK_PAGE_HEADERS });
  }

  // A relative address: the browser resolves it against the link it opened, whatever host the server sees.
  const response = new NextResponse(null, {
    status: 303,
    headers: { ...LINK_PAGE_HEADERS, Location: landing.location },
  });
  const { name, options } = linkCookie(landing.kind);
  response.cookies.set(name, landing.token ?? '', {
    ...options,
    maxAge: landing.token ? LINK_COOKIE_MAX_AGE_SEC : 0,
  });
  return response;
}
