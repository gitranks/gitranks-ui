import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isInvalidRankingPath } from './lib/routing/ranking-routes';
import { SESSION_HINT_CLEAR, SESSION_HINT_COOKIE, SESSION_HINT_SET } from './lib/session-hint';

const { auth } = NextAuth(authConfig);

// Auth.js as middleware; the callback adds nothing, so a signed-in visitor's session is refreshed as before.
const withAuth = auth((_request: NextRequest, _event: NextFetchEvent) => {});

/** The signed-in visitor's rank card on the landing page. */
const RANK_CARD_PATH = '/api/me/rank-card';

/** Matches no route, so a rewrite here renders `app/not-found.tsx` with a 404 status. */
const NOT_FOUND_PATH = '/_404';

// `__Secure-` over HTTPS, bare in local dev; `.0`, `.1`… when the JWT is split across cookies.
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
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
    if (!request.cookies.has(SESSION_HINT_COOKIE)) {
      return NextResponse.next();
    }

    // Signed out or expired: drop the hint, so the page stops asking for a session. A shared cache
    // must not keep this response, or it would clear the hint for visitors who are signed in.
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.append('Set-Cookie', SESSION_HINT_CLEAR);
    return response;
  }

  // A signed-in response carries the rotated session cookie: never let a shared cache keep it,
  // whatever that cache decides about the request on its own. The hint tells the page to fetch
  // the session; setting it on every signed-in response keeps its expiry in step with the session.
  const response = await withAuth(request, event);
  // The landing's rank card may be reused by the browser for 5 minutes; it is still private.
  const cacheControl = request.nextUrl.pathname === RANK_CARD_PATH ? 'private, max-age=300' : 'private, no-cache';
  response?.headers.set('Cache-Control', cacheControl);
  response?.headers.append('Set-Cookie', SESSION_HINT_SET);
  return response;
}

/** Static assets and the always-anonymous routes never need the proxy. */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|badge/(?:user|org|repo)/|repo-badges|sitemap\\.xml|sitemaps|robots\\.txt|favicon\\.ico|icon\\.svg|apple-icon\\.png|icons|fonts|logo-|mark\\.svg|mark-mono\\.svg).*)',
  ],
};
