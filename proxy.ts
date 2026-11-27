import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import { isV2BuilderRequest, mapV2BuilderQuery } from './badge/v3/v2-mapping';
import { buildGateOf } from './lib/build/build-gate';
import { isBuildPath } from './lib/build/paths';
import { prefersMarkdown } from './lib/contribute/accept-markdown';
import { contributeLedgerOpen } from './lib/contribute/ledger-gate';
import { prTimelineGateOf } from './lib/contribute/pr-timeline-gate';
import { interviewsGateOf } from './lib/interviews/interviews-gate';
import { interviewsMarkdownRouteOf, isInterviewsPath } from './lib/interviews/paths';
import { checkGateOf, courseGateOf, projectCourseGateOf } from './lib/learn/course-gate';
import { fixByAttemptRouteGateOf, fixRouteGateOf, fixViewRouteGateOf } from './lib/learn/fix-gate';
import { issuesShowFixedRedirectOf } from './lib/learn/issues';
import { isLearnAboutPath, LEARN_PATH, lessonRouteOf } from './lib/learn/learn-path';
import { LESSON_MISSING_PATH, lessonGateOf } from './lib/learn/lesson-gate';
import {
  checkRouteOf,
  courseRouteOf,
  isLearnFixRemovedPath,
  LEARN_COURSE_MISSING_PATH,
  LEARN_SETUP_PATH,
  learnCourseMarkdownRouteOf,
  learnFixByAttemptOf,
  learnFixRouteOf,
  learnFixViewOf,
  learnIssuesMarkdownRouteOf,
  learnLandingMarkdownRouteOf,
  learnLessonMarkdownRouteOf,
  learnProjectCourseMarkdownRouteOf,
  learnProjectCourseRouteOf,
  realProjectsRouteOf,
} from './lib/learn/paths';
import { realProjectsGateOf } from './lib/learn/real-projects-gate';
import { isLinkPagePath, LINK_PAGE_HEADERS } from './lib/link-token/link-token';
import { packageMarkdownRewriteOf } from './lib/packages/package-paths';
import { isImpossibleEntityPath } from './lib/routing/entity-routes';
import { isInvalidRankingPath } from './lib/routing/ranking-routes';
import { SESSION_COOKIE, SESSION_HINT_CLEAR, SESSION_HINT_COOKIE, SESSION_HINT_SET } from './lib/session-hint';
import { isSkillsCardPath } from './lib/skills/paths';
import {
  AGENTS_DOC_PATH,
  CONTRIBUTE_LANDING_MARKDOWN_PATH,
  CONTRIBUTE_LANDING_MARKDOWN_ROUTE,
  isAuthorizePath,
  isByAttemptPath,
  isContributeFlowPath,
  isContributePath,
  isFairUseAnswerPath,
  isLandingPath,
  isLedgerPath,
  isMaintainersPath,
  isMyPath,
  isOpenAtLaunchPath,
  settingUpHomeOf,
  WORKSPACE_PATHS,
} from './lib/workspace/paths';
import {
  isPrTimelinePath,
  prTimelineMarkdownPath,
  prTimelineRouteOf,
  prTimelineRoutePathOf,
} from './lib/workspace/pr-timeline-path';
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

/** What a Build page tells search engines while Build is open only to some people. */
export const BUILD_NOINDEX = 'noindex, nofollow';
/** What an Interviews page tells search engines while Interviews is open only to some people. */
export const INTERVIEWS_NOINDEX = 'noindex, nofollow';

/** A gate's answer, kept by no shared cache. */
function noStore(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

/** The admin pages: answered per viewer, never stored. */
const ADMIN_PATH = /^\/admin(?:\/|$)/;
/** A person's own Learn pages, read for them alone: progress, review and a course's check. */
const LEARN_OWN_PAGE = /^\/learn\/(?:progress|review|check\/[^/]+)\/?$/;

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

  // Build is open only to the people the API names, until it is open to everyone: anyone else gets a real 404 on every
  // Build address, never kept by a shared cache (it would be served to someone Build is open to). The gate fails
  // closed: an answer that is slow, missing or an error is a no. Only Build's addresses ask. Open to the signed-in
  // person alone, the page is not indexed. Asked before Auth.js, like the 404s above.
  const buildGate = isBuildPath(request.nextUrl.pathname) ? await buildGateOf(request, Date.now()) : null;
  if (buildGate === 'closed') {
    return noStore(NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url)));
  }
  // Interviews the same way, with its own list: every Interviews address (its logos and pictures included) is a real
  // 404, never kept by a shared cache, to anyone it is not open to. It fails closed, and only its addresses ask.
  const interviewsGate = isInterviewsPath(request.nextUrl.pathname)
    ? await interviewsGateOf(request, Date.now())
    : null;
  if (interviewsGate === 'closed') {
    return noStore(NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url)));
  }
  // Interviews' Markdown copies, at the page's address with `.md`, once the gate let them through: answered by their
  // route handlers, which follow the page's state (moved, gone, missing) and are never indexed.
  const interviewsMarkdown = interviewsMarkdownRouteOf(request.nextUrl.pathname);
  if (interviewsMarkdown) {
    return NextResponse.rewrite(new URL(interviewsMarkdown, request.url));
  }

  // A lesson's Markdown copy, for agents, at the page's address with `.md`: answered by its route handler, which follows
  // the page's own gate (paused 503, removed 410, moved to its new copy). Rewritten before Auth.js, like the 404s above.
  const lessonMarkdown = learnLessonMarkdownRouteOf(request.nextUrl.pathname);
  if (lessonMarkdown) {
    return NextResponse.rewrite(new URL(lessonMarkdown, request.url));
  }
  // A course's Markdown copy and that of all courses, the same way: the course's follows the page's own gate.
  const courseMarkdown = learnCourseMarkdownRouteOf(request.nextUrl.pathname);
  if (courseMarkdown) {
    return NextResponse.rewrite(new URL(courseMarkdown, request.url));
  }
  // A project course's Markdown copy, at its page's address with `.md`, the same way.
  const projectMarkdown = learnProjectCourseMarkdownRouteOf(request.nextUrl.pathname);
  if (projectMarkdown) {
    return NextResponse.rewrite(new URL(projectMarkdown, request.url));
  }
  // The landing's Markdown copy, `/learn.md`, the same way.
  const landingMarkdown = learnLandingMarkdownRouteOf(request.nextUrl.pathname);
  if (landingMarkdown) {
    return NextResponse.rewrite(new URL(landingMarkdown, request.url));
  }
  // Contribute's landing in Markdown, `/contribute.md`, the same way: its route handler follows the landing's gate.
  if (request.nextUrl.pathname === CONTRIBUTE_LANDING_MARKDOWN_PATH) {
    return NextResponse.rewrite(new URL(CONTRIBUTE_LANDING_MARKDOWN_ROUTE, request.url));
  }

  // Issues' fixed view as some links spell it, `show=fixed`: the one address, `fixed=1`, for good.
  const issuesFixed = issuesShowFixedRedirectOf(request.nextUrl.pathname, request.nextUrl.search);
  if (issuesFixed) {
    return noStore(NextResponse.redirect(new URL(issuesFixed, request.url), 308));
  }

  // A lesson's or a course's view in real projects, and its Markdown copy, with neither a merged fix nor an open issue
  // is not made: it goes to the lesson or the course (their copy) before the page streams, for now only, since an issue
  // or a fix may come any day. A read that failed or was slow lets the page answer. Never kept by a shared cache.
  const realProjects =
    request.method === 'GET' || request.method === 'HEAD' ? realProjectsRouteOf(request.nextUrl.pathname) : null;
  if (realProjects) {
    const notMade = await realProjectsGateOf(realProjects);
    if (notMade) return noStore(NextResponse.redirect(new URL(notMade, request.url), 307));
  }

  // The Markdown copies of Issues and of a lesson's and a course's view of it, rewritten as the copies above are.
  const issuesMarkdown = learnIssuesMarkdownRouteOf(request.nextUrl.pathname, request.nextUrl.search);
  if (issuesMarkdown) {
    return NextResponse.rewrite(new URL(issuesMarkdown, request.url));
  }

  // A lesson's page streams, so its own notFound() comes too late for a 404 status: the lesson is asked for here first.
  // Missing, the lesson's 404 page answers; a paused or removed lesson of ours answers its own page with a 503 or a 410
  // (the status a rewrite carries); a moved one redirects for good to its new address. A walkthrough's old address, and
  // an old result page, go for good to the fix's page and the person's answers there. None is kept by a shared cache:
  // a lesson comes back, and a fix's pull request opens.
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

  // A course's page streams too, so its address is asked for here first, as a lesson's is: missing, the course's 404
  // page answers; paused or removed, its own page with a 503 or a 410; moved, a permanent redirect to its new address
  // (the search kept). A course's check streams as well and is asked the same way; moved, it goes to the new course's
  // check. None is kept by a shared cache: a course comes back, and a new one may take a free address.
  // A project course's page, `/learn/repos/<owner>/<name>` or `/learn/orgs/<login>`, is asked the same way, by its
  // project; an address that names no GitHub project is the course's 404 at once.
  const asked = request.method === 'GET' || request.method === 'HEAD';
  const course = asked ? courseRouteOf(request.nextUrl.pathname) : null;
  const project = asked && !course ? learnProjectCourseRouteOf(request.nextUrl.pathname) : null;
  const checked = asked && !course && !project ? checkRouteOf(request.nextUrl.pathname) : null;
  if (course || project || checked) {
    const gate = course
      ? await courseGateOf(course)
      : project === 'invalid'
        ? ({ kind: 'missing' } as const)
        : project
          ? await projectCourseGateOf(project)
          : await checkGateOf(checked as string);
    if (gate.kind !== 'page') {
      const response =
        gate.kind === 'missing'
          ? NextResponse.rewrite(new URL(LEARN_COURSE_MISSING_PATH, request.url))
          : gate.kind === 'gone'
            ? NextResponse.rewrite(new URL(gate.path, request.url), { status: gate.status })
            : NextResponse.redirect(new URL(`${gate.path}${request.nextUrl.search}`, request.url), 308);
      response.headers.set('Cache-Control', 'private, no-store');
      if (gate.kind === 'gone' && gate.status === 503) response.headers.set('Retry-After', PAUSED_RETRY_AFTER_SECONDS);
      return response;
    }
  }

  // A fix's walkthrough and a person's answers stream too: where the address leads is asked here first. Nothing there
  // gets the 404, a fix whose page was removed its own page with a 410, another spelling a redirect to the API's; an
  // address of their shape that names no pull request or login, the 404 at once. The footer's address by attempt is
  // answered here as well (a 307 on, or the 404), and the removed fixes' page is shown only by the gate's own
  // rewrite. None is kept by a shared cache: a pull request opens, and answers are shared again.
  const fixPath = request.nextUrl.pathname;
  const fix = asked ? learnFixRouteOf(fixPath) : null;
  const fixAttempt = asked && !fix ? learnFixByAttemptOf(fixPath) : null;
  // The fix's own page, "Learn from it": a pull request with no such view is sent to "How it was made".
  const fixView = asked && !fix && !fixAttempt ? learnFixViewOf(fixPath) : null;
  if (
    fix === 'invalid' ||
    fixAttempt === 'invalid' ||
    fixView === 'invalid' ||
    (asked && isLearnFixRemovedPath(fixPath))
  ) {
    return noStore(NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url)));
  }
  const fixGate = fix
    ? await fixRouteGateOf(fix)
    : fixAttempt
      ? await fixByAttemptRouteGateOf(fixAttempt.attemptId)
      : fixView
        ? await fixViewRouteGateOf(fixView)
        : null;
  if (fixGate && fixGate.kind !== 'page') {
    const search = fix || fixView ? request.nextUrl.search : '';
    return noStore(
      fixGate.kind === 'missing'
        ? NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url))
        : fixGate.kind === 'removed'
          ? NextResponse.rewrite(new URL(fixGate.path, request.url), { status: 410 })
          : NextResponse.redirect(new URL(`${fixGate.path}${search}`, request.url), 307),
    );
  }

  // A pull request's timeline (its page, its Markdown twin and its picture): the API is asked here before anything
  // renders, signed out. Shown goes on to the one cached page, a renamed repo gets a 307 to the address it has now, and
  // anything else the 404, which no shared cache keeps. The short address the footer links is its own route handler,
  // outside every gate. Asked before Auth.js, like the 404s above.
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
              new URL(`${prTimelineRoutePathOf(timeline, gate.path)}${request.nextUrl.search}`, request.url),
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

  // How Learn works is a learner's: a visitor without a session is sent on to the landing, one address for one page.
  // Every other Learn page is open to everyone; a person's own pages ask a visitor to sign in themselves.
  if (isLearnAboutPath(pathname) && !hasSession(request)) {
    const response = NextResponse.redirect(new URL(LEARN_PATH, request.url), 307);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  // A person's own Learn pages have nothing to read for a company-managed GitHub account: it goes to Learn's setup,
  // which says why it can't be used.
  if (asked && LEARN_OWN_PAGE.test(pathname) && hasSession(request)) {
    if ((await requestContributeAccess(request)) === 'managed') {
      const response = NextResponse.redirect(new URL(LEARN_SETUP_PATH, request.url), 307);
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
  // Contribute is open only to signed-in users the API lets in; everyone else gets a real 404, never kept by a shared
  // cache (it would be served to someone who is let in). The page for maintainers and the agent sign-in's consent page
  // (which tells a visitor off the preview so itself) are open to everyone, and once
  // Contribute is launched so are the landing, the MCP docs, the questions and the steps of Contribute's flow, to
  // visitors without a session too.
  // A fair-use message's answer page is what its email and the user's agent link, often opened where the user is not
  // signed in: asked about as the pages under `/my` are (below), never with Contribute's 404 for visitors.
  const answerPage = isFairUseAnswerPath(pathname);
  // The ledger has its own switch (ledger design §6): open, it goes on as any public page; closed, a visitor without a
  // session gets the 404 here, and a signed-in one goes on to the page, which asks the API whether they are on its list.
  if (isLedgerPath(pathname)) {
    if (!(await contributeLedgerOpen(Date.now())) && !hasSession(request)) {
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
    !(isOpenAtLaunchPath(pathname) && (await contributeOpen(Date.now())))
  ) {
    const access = await requestContributeAccess(request);
    // A new account being set up goes to Contribute's home, which says so (and is let through itself). A step of
    // Contribute's flow says so in place, so the address and the answers it carries are kept.
    // A company-managed account goes there too: the home says why it can't be used.
    if (access === 'managed' && !isLandingPath(pathname) && !isContributeFlowPath(pathname)) {
      const response = NextResponse.redirect(new URL(WORKSPACE_PATHS.contribute, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
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
    if (access === 'managed') {
      const response = NextResponse.redirect(new URL(WORKSPACE_PATHS.contribute, request.url));
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
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
    if (buildGate === 'person' && response instanceof Response) response.headers.set('X-Robots-Tag', BUILD_NOINDEX);
    if (interviewsGate === 'person' && response instanceof Response) {
      response.headers.set('X-Robots-Tag', INTERVIEWS_NOINDEX);
    }
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
      // A Skills page's picture is no page: it keeps the headers its route gives it, so shared caches may keep it.
      if (!ENTITY_PAGE.test(request.nextUrl.pathname) || isSkillsCardPath(request.nextUrl.pathname)) {
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
