import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isV2BuilderRequest, mapV2BuilderQuery } from './badge/v3/v2-mapping';
import { prefersMarkdown } from './lib/contribute/accept-markdown';
import {
  AGENTS_DOC_PATH,
  isAttemptPagePath,
  isAuthorizePath,
  isContributePath,
  isLandingPath,
  isLedgerPath,
  isMaintainersPath,
  isOpenAtLaunchPath,
  settingUpHomeOf,
} from './lib/contribute/contribute-path';
import { contributeLedgerOpen } from './lib/contribute/ledger-gate';
import { contributePrTimelineOpen, prTimelineGateOf } from './lib/contribute/pr-timeline-gate';
import {
  isPrTimelinePath,
  PR_TIMELINE_PREVIEW_ROOT,
  prTimelineMarkdownPath,
  prTimelineRouteOf,
} from './lib/contribute/pr-timeline-path';
import { contributeOpen, requestContributeAccess } from './lib/contribute/preview-gate';
import { learnOpenToEveryone } from './lib/learn/learn-everyone';
import {
  isLearnHomePath,
  isLearnOpenPath,
  isLearnPath,
  lessonResultJsonRouteOf,
  lessonRouteOf,
} from './lib/learn/learn-path';
import { LESSON_MISSING_PATH, lessonGateOf } from './lib/learn/lesson-gate';
import { isLinkPagePath, LINK_PAGE_HEADERS } from './lib/link-token/link-token';
import { isPackagePath, packageMarkdownRewriteOf } from './lib/packages/package-paths';
import { packagesPublic, requestMaySeePackages } from './lib/packages/packages-gate';
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

/** The admin pages: answered per viewer, never stored. */
const ADMIN_PATH = /^\/admin(?:\/|$)/;

// `__Secure-` over HTTPS, bare in local dev; `.0`, `.1`… when the JWT is split across cookies.
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

/** Whether the request carries a session cookie (valid or not: the page decides). */
const hasSession = (request: NextRequest) => request.cookies.getAll().some(({ name }) => SESSION_COOKIE.test(name));

const BUILDER_PATH = /^\/badge\/builder(?:\/(?<login>[^/]+))?\/?$/;

/**
 * A developer's, an organization's, a repository's or a package's page, or one post. They render as whole pages and
 * are kept in memory, which a refresh a visitor starts clears before the page reloads; a shared cache would show the
 * old page again. So for visitors without a session they carry the header they had while they rendered per request.
 */
const ENTITY_PAGE = /^\/(?:profile|org|repo|insights|package)\/[^/]/;

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

/** `/repo/<owner>/<name>`, and that path with a trailing slash. */
const REPO_PAGE = /^\/repo\/([^/]+)\/([^/]+)\/?$/;

/**
 * Where a repository's own page is drawn for a visitor who sees its tabs: `/repo/<owner>/<name>/overview`, a path that
 * asked for by itself is a 404 for everyone. `null` for any other path. Only a path the 404 checks let through gets
 * here, so owner and name are possible GitHub names.
 */
export function repoOverviewRewriteOf(pathname: string): string | null {
  const match = REPO_PAGE.exec(pathname);
  return match ? `/repo/${match[1]}/${match[2]}/overview` : null;
}

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

/** A package's scope spelled `%40`, in any letter case: `/package/<registry>/%40scope/…`. */
const PACKAGE_SCOPE_ESCAPED = /^(\/package\/[^/]+\/)%40/i;

/**
 * A package page whose scope spells its `@` as `%40`, as the page's own path: `null` for any other path. The page
 * cannot tell the two spellings apart (its params arrive encoded either way), so the one URL per package is kept here,
 * on the path as it was asked for.
 */
export function packageScopeRedirectOf(pathname: string): string | null {
  return PACKAGE_SCOPE_ESCAPED.test(pathname) ? pathname.replace(PACKAGE_SCOPE_ESCAPED, '$1@') : null;
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const builder = v2BuilderRedirect(request.nextUrl);
  if (builder) {
    return NextResponse.redirect(new URL(builder, request.nextUrl), 308);
  }

  // Before the packages gate below: it is the same page under its own spelling, whoever asks.
  const packagePage = packageScopeRedirectOf(request.nextUrl.pathname);
  if (packagePage) {
    return NextResponse.redirect(new URL(`${packagePage}${request.nextUrl.search}`, request.nextUrl), 308);
  }

  // Checked before Auth.js: its wrapper rebuilds the request on the configured auth URL's origin,
  // which would turn this rewrite into an external one. It also keeps session cookies off 404s.
  if (isInvalidRankingPath(request.nextUrl.pathname) || isImpossibleEntityPath(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
  }

  // A result page's facts as JSON: a page and a route handler cannot share the `[login]` segment, so the address ending
  // in `.json` is answered by the route handler over the same read. Rewritten before Auth.js, like the 404s above.
  const resultJson = lessonResultJsonRouteOf(request.nextUrl.pathname);
  if (resultJson) {
    return NextResponse.rewrite(new URL(resultJson, request.url));
  }

  // A shared lesson's page and its result pages stream, so their own notFound() comes too late for a 404 status: the
  // lesson is asked for here first. Missing, the lesson's 404 page answers; a renamed login goes to its current result
  // page. Neither is kept by a shared cache: the lesson goes public, and the login may change again.
  const lesson = request.method === 'GET' || request.method === 'HEAD' ? lessonRouteOf(request.nextUrl.pathname) : null;
  if (lesson) {
    const gate = await lessonGateOf(lesson);
    if (gate.kind !== 'page') {
      const response =
        gate.kind === 'missing'
          ? NextResponse.rewrite(new URL(LESSON_MISSING_PATH, request.url))
          : NextResponse.redirect(new URL(`${gate.path}${request.nextUrl.search}`, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }

  // A pull request's timeline (its page and its Markdown twin). Public, the API is asked here before anything renders,
  // signed out: shown goes on to the one cached page, a renamed repo gets a 307 to the address it has now, and anything
  // else the 404, which no shared cache keeps. Before it is public, a visitor without a session gets that 404 without a
  // question to the API, and a signed-in one is rewritten to the page's per-request twin, which asks the API as them and
  // is never cached. The short address the footer links is its own route handler, outside every gate. The per-request
  // twin is reachable only through this rewrite. Rewritten before Auth.js, like the 404s above.
  const timeline =
    request.method === 'GET' || request.method === 'HEAD' ? prTimelineRouteOf(request.nextUrl.pathname) : null;
  if (request.nextUrl.pathname.toLowerCase().startsWith(PR_TIMELINE_PREVIEW_ROOT)) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  if (timeline && timeline.kind !== 'short') {
    if (await contributePrTimelineOpen()) {
      const gate = await prTimelineGateOf(timeline.pr);
      if (gate.kind !== 'page') {
        const response =
          gate.kind === 'missing'
            ? NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url))
            : NextResponse.redirect(
                new URL(
                  `${gate.path}${timeline.kind === 'twin' ? '/timeline.md' : ''}${request.nextUrl.search}`,
                  request.url,
                ),
                307,
              );
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
      }
    } else {
      const response = hasSession(request)
        ? NextResponse.rewrite(
            new URL(
              `${PR_TIMELINE_PREVIEW_ROOT}/${timeline.pr.nameWithOwner}/${timeline.pr.number}${timeline.kind === 'twin' ? '/timeline.md' : ''}`,
              request.url,
            ),
          )
        : NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }

  const { pathname } = request.nextUrl;
  // Package pages are shown only to visitors the API lets see them, decided here so no page reads who is asking: until
  // they are open to everyone, a visitor without a session gets a real 404 without a question to the API about them,
  // and a signed-in one is asked about by login and email. The 404 is never kept by a shared cache (it would be served
  // to someone who may see the page). Checked after the 404s above, so an impossible path costs no question.
  if (isPackagePath(pathname) && !(await (hasSession(request) ? requestMaySeePackages(request) : packagesPublic()))) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // A package's facts in markdown, for an agent: answered by the packages API route, which sets its own headers.
  // Rewritten here, before Auth.js, which would make the rewrite an external one.
  const packageMarkdown = packageMarkdownRewriteOf(pathname);
  if (packageMarkdown) {
    return NextResponse.rewrite(new URL(packageMarkdown, request.url));
  }

  // A repository's own page, for a visitor who may see package pages, is its tabbed Overview: rewritten here, before
  // Auth.js (its wrapper would make the rewrite an external one), so the response sets the headers the branches below
  // would have. Anyone else goes on to today's page, untouched. Without a session nothing is asked about the visitor.
  const overview = repoOverviewRewriteOf(pathname);
  if (overview) {
    const session = hasSession(request);
    if (await (session ? requestMaySeePackages(request) : packagesPublic())) {
      const response = NextResponse.rewrite(new URL(`${overview}${request.nextUrl.search}`, request.url));
      if (session) {
        // As any signed-in page; the session cookie is renewed by the next request that passes Auth.js.
        response.headers.set('Cache-Control', 'private, no-cache');
        response.headers.append('Set-Cookie', SESSION_HINT_SET);
      } else if (request.cookies.has(SESSION_HINT_COOKIE)) {
        response.headers.set('Cache-Control', 'private, no-store');
        response.headers.append('Set-Cookie', SESSION_HINT_CLEAR);
      } else {
        response.headers.set('Cache-Control', ENTITY_PAGE_CACHE_CONTROL);
      }
      return response;
    }
  }

  // Contribute is open only to signed-in users the API lets in; everyone else gets a real 404, never kept by a shared
  // cache (it would be served to someone who is let in). The page for maintainers and the agent sign-in's consent page
  // (which tells a visitor off the preview so itself) are open to everyone, and once
  // Contribute is launched so are the landing, the MCP docs and the questions, to visitors without a session too.
  // Learn is behind its own list of people, which the proxy cannot read: a closed Learn page answers a visitor without
  // a session with the 404 here, and a signed-in one goes on to the page, which asks the API whether Learn is open to
  // them. A shared lesson, its result pages and the page for maintainers are open to everyone; the front door too once
  // the API says Learn is open to everyone (the home page's Learn section links there and follows the same answer,
  // asked once a minute per server, only for a visitor's `/learn`). A contribution's or a
  // lesson's own page lets a visitor without a session through: it is the link an agent hands its person, and the page
  // asks them to sign in and comes back to itself (`isAttemptPagePath`).
  if (
    isLearnPath(pathname) &&
    !isLearnOpenPath(pathname) &&
    !isAttemptPagePath(pathname) &&
    !hasSession(request) &&
    !(isLearnHomePath(pathname) && (await learnOpenToEveryone()))
  ) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  // The admin pages answer a visitor without a session with a real 404 here, before anything renders: the page reads
  // the session, so it is sent behind a prerendered shell, and its own not-found would come after a 200. Nothing is
  // asked about the visitor. A signed-in one goes on to the page, which shows only what the API answers them.
  if (ADMIN_PATH.test(pathname) && !hasSession(request)) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  // The ledger has its own switch (ledger design §6): open, it goes on as any public page; closed, a visitor without a
  // session gets the 404 here, and a signed-in one goes on to the page, which asks the API whether they are on its list.
  if (isLedgerPath(pathname)) {
    if (!(await contributeLedgerOpen()) && !hasSession(request)) {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  } else if (
    isContributePath(pathname) &&
    !isPrTimelinePath(pathname) &&
    !isMaintainersPath(pathname) &&
    !isAuthorizePath(pathname) &&
    !(isAttemptPagePath(pathname) && !hasSession(request)) &&
    !(isOpenAtLaunchPath(pathname) && (await contributeOpen()))
  ) {
    const access = await requestContributeAccess(request);
    // A new account being set up goes to Contribute's home, which says so (and is let through itself).
    if (access === 'setting-up' && !isLandingPath(pathname)) {
      const response = NextResponse.redirect(new URL(settingUpHomeOf(request.nextUrl), request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
    if (access === 'hidden') {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
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
  // A shown public timeline says where its Markdown twin is (an answer the gate above let through).
  const twinLink =
    timeline?.kind === 'page'
      ? `<${prTimelineMarkdownPath(timeline.pr)}>; rel="alternate"; type="text/markdown"`
      : null;
  const served = <T>(response: T): T => {
    if (twinLink && response instanceof Response) response.headers.set('Link', twinLink);
    return landing ? withAgentsDocLink(response) : response;
  };

  // Auth.js sets its CSRF and callback-url cookies on every response it touches, and a shared
  // cache will not store a response that sets a cookie. Visitors without a session skip it, so
  // their pages can be cached: sign-in gets its CSRF token from `/api/auth/csrf`, and the
  // session-aware API routes wrap their handlers in `auth()` themselves.
  if (!hasSession(request)) {
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
  // A page a link in our email opens keeps its own `no-store`: it shows an address's follows. An admin page is never
  // stored either, so Back after a sign-out cannot show it again.
  if (request.nextUrl.pathname !== RANK_CARD_PATH) {
    response?.headers.set(
      'Cache-Control',
      isLinkPagePath(pathname) || ADMIN_PATH.test(pathname) ? LINK_PAGE_HEADERS['Cache-Control'] : 'private, no-cache',
    );
  }
  response?.headers.append('Set-Cookie', SESSION_HINT_SET);
  return served(response);
}

/** Static assets and the always-anonymous routes never need the proxy. */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|badge/(?:user|org|repo|package)/|repo-badges|sitemap\\.xml|sitemaps|robots\\.txt|\\.well-known/ai-catalog\\.json|favicon\\.ico|icon\\.svg|apple-icon\\.png|icons|fonts|media/|logo-|mark\\.svg|mark-mono\\.svg).*)',
  ],
};
