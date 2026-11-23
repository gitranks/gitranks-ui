import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isV2BuilderRequest, mapV2BuilderQuery } from './badge/v3/v2-mapping';
import { prefersMarkdown } from './lib/contribute/accept-markdown';
import { contributeLedgerOpen } from './lib/contribute/ledger-gate';
import { prTimelineGateOf } from './lib/contribute/pr-timeline-gate';
import { learnOpenToEveryone } from './lib/learn/learn-everyone';
import {
  isLearnHomePath,
  isLearnOpenPath,
  isLearnPath,
  lessonResultJsonRouteOf,
  lessonRouteOf,
  publicProgressRouteOf,
} from './lib/learn/learn-path';
import { LESSON_MISSING_PATH, lessonGateOf } from './lib/learn/lesson-gate';
import { progressGateOf } from './lib/learn/public-progress/progress-gate';
import { isLinkPagePath, LINK_PAGE_HEADERS } from './lib/link-token/link-token';
import { packageMarkdownRewriteOf } from './lib/packages/package-paths';
import { isImpossibleEntityPath } from './lib/routing/entity-routes';
import { isInvalidRankingPath } from './lib/routing/ranking-routes';
import { SESSION_COOKIE, SESSION_HINT_CLEAR, SESSION_HINT_COOKIE, SESSION_HINT_SET } from './lib/session-hint';
import { requestLearnAccess } from './lib/workspace/gate';
import {
  AGENTS_DOC_PATH,
  isAuthorizePath,
  isByAttemptPath,
  isContributeFlowPath,
  isContributePath,
  isFairUseAnswerPath,
  isLandingPath,
  isLearnFlowPath,
  isLedgerPath,
  isMaintainersPath,
  isMyPath,
  isOpenAtLaunchPath,
  settingUpHomeOf,
  WORKSPACE_PATHS,
} from './lib/workspace/paths';
import { isPrTimelinePath, prTimelineMarkdownPath, prTimelineRouteOf } from './lib/workspace/pr-timeline-path';
import { contributeOpen, requestContributeAccess, requestWorkspaceAccess } from './lib/workspace/preview-gate';

/** When search engines may ask again for a paused lesson: an hour, in seconds. */
const PAUSED_RETRY_AFTER_SECONDS = '3600';

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
 * Where a repository's own page is drawn: `/repo/<owner>/<name>/overview`, a path that asked for by itself is a 404.
 * `null` for any other path. Only a path the 404 checks let through gets here, so owner and name are possible GitHub
 * names.
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

  // The same page under its own spelling, whoever asks.
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

  // A lesson's page and its result pages stream, so their own notFound() comes too late for a 404 status: the lesson
  // is asked for here first. Missing, the lesson's 404 page answers; a paused or removed lesson of ours answers its own
  // page with a 503 or a 410 (the status a rewrite carries); a moved one redirects for good to its new address, and a
  // renamed login goes to its current result page. None is kept by a shared cache: a lesson comes back, goes public,
  // and a login may change again.
  const lesson = request.method === 'GET' || request.method === 'HEAD' ? lessonRouteOf(request.nextUrl.pathname) : null;
  if (lesson) {
    const gate = await lessonGateOf(lesson);
    if (gate.kind !== 'page') {
      const response =
        gate.kind === 'missing'
          ? NextResponse.rewrite(new URL(LESSON_MISSING_PATH, request.url))
          : gate.kind === 'gone'
            ? NextResponse.rewrite(new URL(gate.path, request.url), { status: gate.status })
            : NextResponse.redirect(
                new URL(`${gate.path}${request.nextUrl.search}`, request.url),
                gate.permanent ? 308 : 307,
              );
      response.headers.set('Cache-Control', 'private, no-store');
      // A paused lesson is coming back: search engines are told when to ask again, so it keeps its place.
      if (gate.kind === 'gone' && gate.status === 503) response.headers.set('Retry-After', PAUSED_RETRY_AFTER_SECONDS);
      return response;
    }
  }

  // A person's public progress page streams too: their record is asked for here first. None, or the login asked under
  // another spelling than the one stored, gets the 404, which no shared cache keeps (a record may appear soon).
  const progressLogin =
    request.method === 'GET' || request.method === 'HEAD' ? publicProgressRouteOf(request.nextUrl.pathname) : null;
  if (progressLogin && (await progressGateOf(progressLogin)) === 'missing') {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  // A pull request's timeline (its page and its Markdown twin): the API is asked here before anything renders, signed
  // out. Shown goes on to the one cached page, a renamed repo gets a 307 to the address it has now, and anything else
  // the 404, which no shared cache keeps. The short address the footer links is its own route handler, outside every
  // gate. Asked before Auth.js, like the 404s above.
  let shownTimeline = false;
  const timeline =
    request.method === 'GET' || request.method === 'HEAD' ? prTimelineRouteOf(request.nextUrl.pathname) : null;
  if (timeline && timeline.kind !== 'short') {
    const gate = await prTimelineGateOf(timeline.pr);
    shownTimeline = gate.kind === 'page' && gate.confirmed;
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
  }

  const { pathname } = request.nextUrl;

  // A package's facts in markdown, for an agent: answered by the packages API route, which sets its own headers.
  // Rewritten here, before Auth.js, which would make the rewrite an external one.
  const packageMarkdown = packageMarkdownRewriteOf(pathname);
  if (packageMarkdown) {
    return NextResponse.rewrite(new URL(packageMarkdown, request.url));
  }

  // A repository's own page is its tabbed Overview: rewritten here, before Auth.js (its wrapper would make the rewrite
  // an external one), so the response sets the headers the branches below would have.
  const overview = repoOverviewRewriteOf(pathname);
  if (overview) {
    const response = NextResponse.rewrite(new URL(`${overview}${request.nextUrl.search}`, request.url));
    if (hasSession(request)) {
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

  // Contribute is open only to signed-in users the API lets in; everyone else gets a real 404, never kept by a shared
  // cache (it would be served to someone who is let in). The page for maintainers and the agent sign-in's consent page
  // (which tells a visitor off the preview so itself) are open to everyone, and once
  // Contribute is launched so are the landing, the MCP docs, the questions and the steps of Contribute's flow, to
  // visitors without a session too.
  // Learn is behind its own list of people, which the API answers: a closed Learn page answers a visitor without a
  // session, and a signed-in viewer Learn is not open to, with the 404 here; a signed-in one it is open to goes on. A
  // shared lesson, its result pages and the page for maintainers are open to everyone; the front door and the three
  // steps of Learn's flow too once the API says Learn is open to everyone (the home page's Learn section links there and
  // follows the same answer, asked once a minute per server, only for a visitor's `/learn` and its flow). A
  // contribution's or a lesson's old address redirects before this, to the pull request's page under `/my`, which asks
  // a visitor to sign in.
  // A request with a session is asked here too, before anything renders: an account Learn is not open to gets the
  // real 404, not Learn's shell (its header, tabs and titles) streamed ahead of the page's own not-found. A session the
  // server cannot read (expired) is a visitor's.
  // Only a page view is asked (GET, HEAD): a page's own actions are checked by the API itself. An ask that takes too
  // long lets the request on, to the page's own check.
  if (isLearnPath(pathname) && !isLearnOpenPath(pathname)) {
    const access = !hasSession(request)
      ? 'signed-out'
      : request.method === 'GET' || request.method === 'HEAD'
        ? await requestLearnAccess(request)
        : 'open';
    const visitorLetThrough = async () =>
      (isLearnHomePath(pathname) || isLearnFlowPath(pathname)) && (await learnOpenToEveryone());
    if (access === 'closed' || (access === 'signed-out' && !(await visitorLetThrough()))) {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  }
  // The admin pages answer a visitor without a session with a real 404 here, before anything renders: the page reads
  // the session, so it is sent behind a prerendered shell, and its own not-found would come after a 200. Nothing is
  // asked about the visitor. A signed-in one goes on to the page, which shows only what the API answers them.
  if (ADMIN_PATH.test(pathname) && !hasSession(request)) {
    const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  // A fair-use message's answer page is what its email and the user's agent link, often opened where the user is not
  // signed in: asked about as the pages under `/my` are (below), never with Contribute's 404 for visitors.
  const answerPage = isFairUseAnswerPath(pathname);
  // The ledger has its own switch (ledger design §6): open, it goes on as any public page; closed, a visitor without a
  // session gets the 404 here, and a signed-in one goes on to the page, which asks the API whether they are on its list.
  if (isLedgerPath(pathname)) {
    if (!(await contributeLedgerOpen()) && !hasSession(request)) {
      const response = NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
  } else if (
    !answerPage &&
    isContributePath(pathname) &&
    !isPrTimelinePath(pathname) &&
    !isMaintainersPath(pathname) &&
    !isAuthorizePath(pathname) &&
    !(isOpenAtLaunchPath(pathname) && (await contributeOpen()))
  ) {
    const access = await requestContributeAccess(request);
    // A new account being set up goes to Contribute's home, which says so (and is let through itself). A step of
    // Contribute's flow says so in place, so the address and the answers it carries are kept.
    if (access === 'setting-up' && !isLandingPath(pathname) && !isContributeFlowPath(pathname)) {
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

  // The workspace's pages under `/my`, and a fair-use message's answer page, are what emails and agents link: a visitor without a session (or with one the
  // server cannot read) goes on to the page, which asks them to sign in and comes back to the same address, never kept
  // by a shared cache. A signed-in account is asked about as on Contribute's pages: the workspace closed to it gets the
  // real 404, and one being set up goes to Contribute's home, carrying the step it was on.
  const myPage = isMyPath(pathname) || answerPage;
  // The address by attempt is a route that only redirects: a visitor is shown the workspace's sign-in on that same
  // address, so the sign-in comes back to it.
  const signInHere = () => {
    const response = NextResponse.rewrite(new URL(WORKSPACE_PATHS.pullRequests, request.url));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  const byAttempt = isByAttemptPath(pathname) && (request.method === 'GET' || request.method === 'HEAD');
  if (byAttempt && !hasSession(request)) return signInHere();
  if (myPage && hasSession(request) && (request.method === 'GET' || request.method === 'HEAD')) {
    const access = await requestWorkspaceAccess(request);
    if (access === 'signed-out' && byAttempt) return signInHere();
    if (access === 'setting-up') {
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
    shownTimeline && timeline?.kind === 'page'
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
      // A workspace page's sign-in is never kept by a shared cache: the same address shows the user's own once signed in.
      if (myPage) {
        const response = NextResponse.next();
        response.headers.set('Cache-Control', 'private, no-store');
        return response;
      }
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
