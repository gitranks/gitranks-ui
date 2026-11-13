import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isV2BuilderRequest, mapV2BuilderQuery } from './badge/v3/v2-mapping';
import { prefersMarkdown } from './lib/contribute/accept-markdown';
import {
  AGENTS_DOC_PATH,
  isAuthorizePath,
  isContributePath,
  isLandingPath,
  isLedgerPath,
  isMaintainersPath,
  isOpenAtLaunchPath,
} from './lib/contribute/contribute-path';
import { contributeLedgerOpen } from './lib/contribute/ledger-gate';
import { contributeOpen, requestMaySeeContribute } from './lib/contribute/preview-gate';
import { isImpossibleEntityPath } from './lib/routing/entity-routes';
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

const BUILDER_PATH = /^\/badge\/builder(?:\/(?<login>[^/]+))?\/?$/;

/**
 * A developer's, an organization's or a repository's page, or one post. They render as whole pages and are kept in
 * memory, which a refresh a visitor starts clears before the page reloads; a shared cache would show the old page
 * again. So for visitors without a session they carry the header they had while they rendered per request.
 */
const ENTITY_PAGE = /^\/(?:profile|org|repo|insights)\/[^/]/;

/** The landing's pointer to its markdown for agents, on every answer that serves the landing. */
const AGENTS_DOC_LINK = `<${AGENTS_DOC_PATH}>; rel="alternate"; type="text/markdown"`;

/** A landing answer, told where its markdown is and that it differs by `Accept`. */
function withAgentsDocLink<T>(response: T): T {
  if (response instanceof Response) {
    response.headers.set('Link', AGENTS_DOC_LINK);
    response.headers.append('Vary', 'Accept');
  }
  return response;
}
export const ENTITY_PAGE_CACHE_CONTROL = 'private, no-cache, no-store, max-age=0, must-revalidate';

/**
 * An old builder link (its query names, or a login in the path) as the new builder's path and query, with its choices
 * mapped; `null` for any other request. The builder page is cached and never sees the query, so it happens here.
 */
export function v2BuilderRedirect(url: URL): string | null {
  const match = BUILDER_PATH.exec(url.pathname);
  if (!match) return null;

  let login: string | null = null;
  try {
    login = match.groups?.login ? decodeURIComponent(match.groups.login) : null;
  } catch {
    return null;
  }
  if (!isV2BuilderRequest(url.searchParams, login)) return null;

  return `/badge/builder?${mapV2BuilderQuery(url.searchParams, login).toString()}`;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const builder = v2BuilderRedirect(request.nextUrl);
  if (builder) {
    return NextResponse.redirect(new URL(builder, request.nextUrl), 308);
  }

  // Checked before Auth.js: its wrapper rebuilds the request on the configured auth URL's origin,
  // which would turn this rewrite into an external one. It also keeps session cookies off 404s.
  if (isInvalidRankingPath(request.nextUrl.pathname) || isImpossibleEntityPath(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  // Contribute is open only to signed-in users the API lets in; everyone else gets a real 404, never kept by a shared
  // cache (it would be served to someone who is let in). The page for maintainers and the agent sign-in's consent page
  // (which tells a visitor off the preview so itself) are open to everyone, and once
  // Contribute is launched so are the landing, the MCP docs and the questions, to visitors without a session too.
  const { pathname } = request.nextUrl;
  // The ledger has its own switch (ledger design §6): open, it goes on as any public page; closed, a visitor without a
  // session gets the 404 here, and a signed-in one goes on to the page, which asks the API whether they are on its list.
  if (isLedgerPath(pathname)) {
    if (!(await contributeLedgerOpen()) && !request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name))) {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  } else if (
    isContributePath(pathname) &&
    !isMaintainersPath(pathname) &&
    !isAuthorizePath(pathname) &&
    !(isOpenAtLaunchPath(pathname) && (await contributeOpen())) &&
    !(await requestMaySeeContribute(request))
  ) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // The landing in markdown, for an agent that asks for it at least as much as HTML: rewritten here, before Auth.js, which would turn
  // the rewrite into an external one. Never kept by a shared cache: the same URL answers HTML to everyone else. Every
  // other answer of the landing says where its markdown is and that it differs by `Accept`.
  const landing = isLandingPath(pathname);
  if (landing && request.method === 'GET' && prefersMarkdown(request.headers.get('accept'))) {
    const response = NextResponse.rewrite(new URL(AGENTS_DOC_PATH, request.url));
    response.headers.set('Vary', 'Accept');
    response.headers.set('Cache-Control', 'private, no-cache');
    return response;
  }
  const served = <T>(response: T): T => (landing ? withAgentsDocLink(response) : response);

  // Auth.js sets its CSRF and callback-url cookies on every response it touches, and a shared
  // cache will not store a response that sets a cookie. Visitors without a session skip it, so
  // their pages can be cached: sign-in gets its CSRF token from `/api/auth/csrf`, and the
  // session-aware API routes wrap their handlers in `auth()` themselves.
  if (!request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name))) {
    if (!request.cookies.has(SESSION_HINT_COOKIE)) {
      if (!ENTITY_PAGE.test(request.nextUrl.pathname)) {
        return served(NextResponse.next());
      }
      const response = NextResponse.next();
      response.headers.set('Cache-Control', ENTITY_PAGE_CACHE_CONTROL);
      return response;
    }

    // Signed out or expired: drop the hint, so the page stops asking for a session. A shared cache
    // must not keep this response, or it would clear the hint for visitors who are signed in.
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.append('Set-Cookie', SESSION_HINT_CLEAR);
    return served(response);
  }

  // A signed-in response carries the rotated session cookie: never let a shared cache keep it,
  // whatever that cache decides about the request on its own. The hint tells the page to fetch
  // the session; setting it on every signed-in response keeps its expiry in step with the session.
  const response = await withAuth(request, event);
  // The landing's rank card sets its own, always private: 5 minutes at the viewer's own `?login=`, never stored
  // otherwise. The proxy cannot tell which login the session holds, nor the route's status.
  if (request.nextUrl.pathname !== RANK_CARD_PATH) {
    response?.headers.set('Cache-Control', 'private, no-cache');
  }
  response?.headers.append('Set-Cookie', SESSION_HINT_SET);
  return served(response);
}

/** Static assets and the always-anonymous routes never need the proxy. */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|badge/(?:user|org|repo)/|repo-badges|sitemap\\.xml|sitemaps|robots\\.txt|\\.well-known/ai-catalog\\.json|favicon\\.ico|icon\\.svg|apple-icon\\.png|icons|fonts|logo-|mark\\.svg|mark-mono\\.svg).*)',
  ],
};
