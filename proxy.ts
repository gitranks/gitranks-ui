import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isInvalidRankingPath } from './lib/routing/ranking-routes';

const { auth } = NextAuth(authConfig);

// Auth.js as middleware; the callback adds nothing, so requests get the same session handling as before.
const withAuth = auth((_request: NextRequest, _event: NextFetchEvent) => {});

/** Matches no route, so a rewrite here renders `app/not-found.tsx` with a 404 status. */
const NOT_FOUND_PATH = '/_404';

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Checked before Auth.js: its wrapper rebuilds the request on the configured auth URL's origin,
  // which would turn this rewrite into an external one. It also keeps session cookies off 404s.
  if (isInvalidRankingPath(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  return withAuth(request, event);
}

/**
 * Auth.js sets its CSRF and callback-url cookies on every response it touches, and a shared
 * cache will not store a response that sets a cookie. Keep it off anonymous, cacheable
 * routes — avatars, badges, sitemaps, robots.txt — and off static assets; pages and the
 * session-aware API routes still go through it.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|sitemap\\.xml|sitemaps|robots\\.txt|favicon\\.ico|apple-icon\\.png|icons|fonts|logo-).*)',
  ],
};
