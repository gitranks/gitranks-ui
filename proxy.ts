import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isInvalidRankingPath } from './lib/routing/ranking-routes';

const { auth } = NextAuth(authConfig);

// Auth.js as middleware; the callback adds nothing, so a signed-in visitor's session is refreshed as before.
const withAuth = auth((_request: NextRequest, _event: NextFetchEvent) => {});

/** Matches no route, so a rewrite here renders `app/not-found.tsx` with a 404 status. */
const NOT_FOUND_PATH = '/_404';

// `__Secure-` over HTTPS, bare in local dev; `.0`, `.1`… when the JWT is split across cookies.
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Checked before Auth.js: its wrapper rebuilds the request on the configured auth URL's origin,
  // which would turn this rewrite into an external one. It also keeps session cookies off 404s.
  if (isInvalidRankingPath(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  // Auth.js sets its CSRF and callback-url cookies on every response it touches, and a shared
  // cache will not store a response that sets a cookie. Visitors without a session skip it, so
  // their pages can be cached: sign-in gets its CSRF token from `/api/auth/csrf`, and the
  // session-aware API routes wrap their handlers in `auth()` themselves.
  if (!request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name))) {
    return NextResponse.next();
  }

  return withAuth(request, event);
}

/** Static assets and the always-anonymous routes never need the proxy. */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|sitemap\\.xml|sitemaps|robots\\.txt|favicon\\.ico|apple-icon\\.png|icons|fonts|logo-).*)',
  ],
};
