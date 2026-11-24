import type { Route } from 'next';

import { LEARN_PROJECT_COURSE_PAGE_BUILT } from './built-pages';
import { CONTACT_EMAIL } from '@/lib/legal';
import { ATTEMPT_ID, GITHUB_LOGIN } from '@/lib/workspace/paths';
import { type PrRef, parsePrLink } from '@/lib/workspace/pr-feedback';

/**
 * Every address of Learn's pages, built here and nowhere else. Today's pages keep theirs in `learn-path.ts` until they
 * are replaced.
 */

/** Learn home for a learner; the landing for everyone else. */
export const LEARN_HOME_PATH = '/learn' as Route;
/** All courses. */
export const LEARN_COURSES_PATH = '/learn/courses' as Route;
/** The issues a learner can take. */
export const LEARN_ISSUES_PATH = '/learn/issues' as Route;
/** The signed-in person's own progress. */
export const LEARN_PROGRESS_PATH = '/learn/progress' as Route;
/** Set up Learn. */
export const LEARN_SETUP_PATH = '/learn/setup' as Route;
/** The review of every course. */
export const LEARN_REVIEW_PATH = '/learn/review' as Route;

/** All courses with what was typed in their search, so a result can be sent to someone. */
export const coursesSearchPath = (query: string) =>
  (query ? `${LEARN_COURSES_PATH}?q=${encodeURIComponent(query)}` : LEARN_COURSES_PATH) as Route;
/** One course's page. */
export const coursePath = (slug: string) => `/learn/courses/${encodeURIComponent(slug)}` as Route;
/** The check of one course. */
export const checkPath = (course: string) => `/learn/check/${encodeURIComponent(course)}` as Route;
/** The review of one course, opened from its page; of every course without one. */
export const learnReviewPath = (course: string | null) =>
  (course ? `${LEARN_REVIEW_PATH}?course=${encodeURIComponent(course)}` : LEARN_REVIEW_PATH) as Route;
/** A lesson's page. */
export const learnLessonPath = (slug: string) => `/learn/lessons/${encodeURIComponent(slug)}` as Route;

/** A lesson's view of Issues, at its own address. */
export const learnLessonRealWorldPath = (slug: string) => `${learnLessonPath(slug)}/real-world` as Route;
/** A course's view of Issues, at its own address. */
export const learnCourseRealWorldPath = (slug: string) => `${coursePath(slug)}/real-world` as Route;

/** A page's Markdown copy: the page's own address with `.md`. */
export const markdownPathOf = (path: string) => `${path}.md`;

/** The Markdown copy of a course, and of all courses. */
export const courseMarkdownPath = (slug: string) => markdownPathOf(coursePath(slug));
export const LEARN_COURSES_MARKDOWN_PATH = `${LEARN_COURSES_PATH}.md`;

/** The Markdown copy of Learn's landing. */
export const LEARN_LANDING_MARKDOWN_PATH = markdownPathOf(LEARN_HOME_PATH);
/** Where the proxy answers `/learn.md` from: a page and a route handler cannot share the segment. */
export const LEARN_LANDING_MARKDOWN_ROUTE = '/api/learn/home.md';

/** Where the proxy answers the landing's Markdown copy from, for `/learn.md`; null for any other path. */
export const learnLandingMarkdownRouteOf = (pathname: string): string | null =>
  pathname === LEARN_LANDING_MARKDOWN_PATH ? LEARN_LANDING_MARKDOWN_ROUTE : null;

/** A lesson's Markdown copy. */
export const learnLessonMarkdownPath = (slug: string) => markdownPathOf(learnLessonPath(slug)) as Route;

/** A lesson's fun fact: the lesson's page with "Did you know?" open, the address its Share button copies. */
export const learnFactPath = (slug: string) => `${learnLessonPath(slug)}?fact` as Route;

/**
 * Where a lesson's Markdown copy is answered from: the proxy rewrites `/learn/lessons/<slug>.md` here, since a page and a
 * route handler cannot share the `[slug]` segment.
 */
export const learnLessonMarkdownRoute = (slug: string) => `/api/learn/lessons/${encodeURIComponent(slug)}/lesson.md`;

/** The picture a posted link to a lesson shows, and the one its fun fact's link shows (`?fact`). */
export const learnLessonCardPath = (slug: string) => `${learnLessonPath(slug)}/card.png`;
export const learnFactCardPath = (slug: string) => `${learnLessonPath(slug)}/fact.png`;

/**
 * Where the proxy shows a paused or removed lesson's page, with its status: an address no lesson has, since `_gone` is
 * not a slug's shape.
 */
export const learnLessonGonePath = (slug: string) => `/learn/lessons/_gone/${encodeURIComponent(slug)}` as Route;

/** Where the browser reads the signed-in person's side of a lesson, of a course, and of all courses. */
export const learnLessonMinePath = (slug: string) => `/api/me/learn/lessons/${encodeURIComponent(slug)}`;
export const learnCourseMinePath = (slug: string) => `/api/me/learn/courses/${encodeURIComponent(slug)}`;
export const LEARN_COURSES_MINE_PATH = '/api/me/learn/courses';
/** Where the browser reads what a lesson's and a course's pages add of real issues for the signed-in person. */
export const learnLessonRealMinePath = (slug: string) => `${learnLessonMinePath(slug)}/real-world`;
export const learnCourseRealMinePath = (slug: string) => `${learnCourseMinePath(slug)}/real-world`;
/** Learn home's list email, read again while the person has no address. */
export const LEARN_HOME_ISSUES_EMAIL_MINE_PATH = '/api/me/learn/home/issues-email';
/** "What you know": a course's sheet of lessons marked as known, changed without taking the check again. */
export const learnKnownPath = (course: string) => `${checkPath(course)}?known` as Route;
/** Where the browser reads the signed-in person's run of a course's check, or its result once it ended. */
export const learnCheckMinePath = (course: string) => `/api/me/learn/check/${encodeURIComponent(course)}`;
/** Where the browser reads the signed-in person's review: of one course, or of every course. */
export const learnReviewMinePath = (course: string | null) =>
  course ? `/api/me/learn/review?course=${encodeURIComponent(course)}` : '/api/me/learn/review';
/** Where the browser reads the signed-in person's setup. */
export const LEARN_SETUP_MINE_PATH = '/api/me/learn/setup';
/** Where the browser reads the signed-in person's progress, and a page of their History (the days before `before`). */
export const LEARN_MY_PROGRESS_MINE_PATH = '/api/me/learn/progress';
export const learnHistoryMinePath = (before: string | null) =>
  before
    ? `${LEARN_MY_PROGRESS_MINE_PATH}/history?before=${encodeURIComponent(before)}`
    : `${LEARN_MY_PROGRESS_MINE_PATH}/history`;
/** Where the browser reads the signed-in person's fixes made with Learn, and the walkthroughs they passed. */
export const LEARN_MY_FIXES_MINE_PATH = `${LEARN_MY_PROGRESS_MINE_PATH}/fixes`;
export const LEARN_MY_WALKTHROUGHS_MINE_PATH = `${LEARN_MY_PROGRESS_MINE_PATH}/walkthroughs`;
/** The query that asks the depth of each lesson in some of the person's courses, by their slugs, comma-separated. */
export const COURSE_DEPTHS_QUERY = 'depths';
/** Where the browser reads the depth of each lesson in the given courses of the person. */
export const learnCourseDepthsPath = (courses: readonly string[]) =>
  `${LEARN_COURSES_MINE_PATH}?${COURSE_DEPTHS_QUERY}=${courses.map(encodeURIComponent).join(',')}`;
/** The query a course's page adds to ask whether the check leads it; the route reads the level only then. */
export const CHECK_FIRST_QUERY = 'check';
/** The person's side of a course as the course's page asks it: with whether the check leads the page. */
export const learnCourseSidePath = (slug: string) => `${learnCourseMinePath(slug)}?${CHECK_FIRST_QUERY}=1`;
/** The query a lesson's page adds to ask the person's main language with their side; the route reads it only then. */
export const MAIN_LANGUAGE_QUERY = 'main';
/** The person's side of a lesson as the lesson's page asks it: with their setup's main language. */
export const learnLessonSidePath = (slug: string) => `${learnLessonMinePath(slug)}?${MAIN_LANGUAGE_QUERY}=1`;

/**
 * Where the proxy shows a paused or removed course's page, with its status, and a missing course's 404: addresses no
 * course has, since `_gone` and `_missing` are not a slug's shape.
 */
export const learnCourseGonePath = (slug: string) => `/learn/courses/_gone/${encodeURIComponent(slug)}` as Route;
export const LEARN_COURSE_MISSING_PATH = '/learn/courses/_missing' as Route;

/** The picture a posted link to a course shows, and the one of all courses. */
export const learnCourseCardPath = (slug: string) => `${coursePath(slug)}/card.png`;
export const LEARN_COURSES_CARD_PATH = `${LEARN_COURSES_PATH}/card.png`;

/**
 * Where a course's Markdown copy and that of all courses are answered from: the proxy rewrites
 * `/learn/courses/<slug>.md` and `/learn/courses.md` here, since a page and a route handler cannot share a segment.
 */
export const learnCourseMarkdownRoute = (slug: string) => `/api/learn/courses/${encodeURIComponent(slug)}/course.md`;
export const LEARN_COURSES_MARKDOWN_ROUTE = '/api/learn/courses/all.md';

/**
 * The project a project course is about, as the API names it: a repository's `owner/name`, or an organisation's
 * login. Exactly one of the two.
 */
export type LearnProject = { repo: string; org?: never } | { org: string; repo?: never };

type ProjectParts = { kind: 'repo'; owner: string; name: string } | { kind: 'org'; login: string };

/** A project's parts; throws for a repository that is not one `owner/name`, or an empty login. */
function partsOf(project: LearnProject): ProjectParts {
  if (project.repo !== undefined) {
    const [owner, name, ...rest] = project.repo.split('/');
    if (!owner || !name || rest.length)
      throw new Error(`A project course's repository is not owner/name: "${project.repo}"`);
    return { kind: 'repo', owner, name };
  }
  if (!project.org) throw new Error("A project course's organisation has no login");
  return { kind: 'org', login: project.org };
}

/** A repository's `owner/name` as two address segments, each encoded. */
const repoSegments = ({ owner, name }: { owner: string; name: string }) =>
  `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

/**
 * A project course's page: `/learn/repos/<owner>/<name>` for a repository, `/learn/orgs/<login>` for an organisation.
 * Throws for a repository that is not one `owner/name`, or an empty login, as the paths below do.
 */
export function learnProjectCoursePath(project: LearnProject): Route {
  const parts = partsOf(project);
  return (
    parts.kind === 'repo' ? `/learn/repos/${repoSegments(parts)}` : `/learn/orgs/${encodeURIComponent(parts.login)}`
  ) as Route;
}
/** A project course's Markdown copy, at its page's address with `.md`. */
export const learnProjectCourseMarkdownPath = (project: LearnProject) =>
  markdownPathOf(learnProjectCoursePath(project));
/** The picture a posted link to a project course shows. */
export const learnProjectCourseCardPath = (project: LearnProject) => `${learnProjectCoursePath(project)}/card.png`;

/**
 * The Issues page narrowed to one project, `?repo=<owner>/<name>` or `?org=<login>`; with `fixed`, its merged fixes
 * (`fixed=1`).
 */
export function learnProjectIssuesPath(project: LearnProject, { fixed = false }: { fixed?: boolean } = {}): Route {
  const parts = partsOf(project);
  const narrowing = parts.kind === 'repo' ? `repo=${repoSegments(parts)}` : `org=${encodeURIComponent(parts.login)}`;
  return `${LEARN_ISSUES_PATH}?${narrowing}${fixed ? '&fixed=1' : ''}` as Route;
}

/** A course as a link names it: its slug, and its project when it is a project course. */
export type CourseRef = { slug: string; project?: { repo: string | null; org: string | null } | null };

/** The project a project course is about, as the paths take it; null for any other course. */
export function courseProjectOf(course: CourseRef): LearnProject | null {
  if (course.project?.repo) return { repo: course.project.repo };
  if (course.project?.org) return { org: course.project.org };
  return null;
}

/**
 * Where a link to a course leads: a project course's own address, `/learn/repos/<owner>/<name>` or
 * `/learn/orgs/<login>`, once those pages exist; any other course's, and a project the paths cannot name, at
 * `/learn/courses/<slug>` (which sends a project course on to its own address).
 */
export function courseHrefOf(course: CourseRef): Route {
  const project = LEARN_PROJECT_COURSE_PAGE_BUILT ? courseProjectOf(course) : null;
  if (project) {
    try {
      return learnProjectCoursePath(project);
    } catch {
      // A repository that is not one owner/name: the course's slug address still leads to it.
    }
  }
  return coursePath(course.slug);
}

/** A course's Markdown copy, at the address its links lead to, with `.md`. */
export const courseMarkdownHrefOf = (course: CourseRef) => markdownPathOf(courseHrefOf(course));

/** The picture a posted link to a course shows, beside the address its links lead to. */
export const courseCardHrefOf = (course: CourseRef) => `${courseHrefOf(course)}/card.png`;

/**
 * Where the proxy shows a project course that was removed (its 410) or paused (its 503): `_gone` is no GitHub
 * login's shape, so no project is ever under it.
 */
export function learnProjectCourseGonePath(project: LearnProject): Route {
  const parts = partsOf(project);
  return (
    parts.kind === 'repo'
      ? `/learn/repos/_gone/${repoSegments(parts)}`
      : `/learn/orgs/_gone/${encodeURIComponent(parts.login)}`
  ) as Route;
}

/** A project course's address as the API asks about it: `repository` with `owner/name`, or `org` with the login. */
export type LearnProjectRoute = { kind: 'repository' | 'org'; slug: string };

/** The project an address names, as the paths take it. */
export const projectOfRoute = (route: LearnProjectRoute): LearnProject =>
  route.kind === 'repository' ? { repo: route.slug } : { org: route.slug };

const LOGIN_SHAPE = new RegExp(`^${GITHUB_LOGIN}$`);
/** A repository's name as GitHub allows it: up to 100 of its characters, never `.` or `..`. */
const REPO_NAME_SHAPE = /^(?!\.\.?$)[A-Za-z0-9._-]{1,100}$/;

/**
 * A project by its names, as GitHub allows them: a login alone (an organisation), or a login and a repository's name.
 * Null when either cannot be a GitHub name.
 */
function projectRouteOfNames(names: readonly string[]): LearnProjectRoute | null {
  if (!LOGIN_SHAPE.test(names[0] ?? '')) return null;
  if (names.length === 1) return { kind: 'org', slug: names[0] };
  return names.length === 2 && REPO_NAME_SHAPE.test(names[1])
    ? { kind: 'repository', slug: `${names[0]}/${names[1]}` }
    : null;
}

/** A repository's `owner/name` as written, when GitHub could name one so; null otherwise. */
export const repoNameOf = (value: string): string | null =>
  projectRouteOfNames(value.split('/'))?.kind === 'repository' ? value : null;

/** An organisation's login as written, when GitHub could name one so; null otherwise. */
export const orgLoginOf = (value: string): string | null => (LOGIN_SHAPE.test(value) ? value : null);

/** The project of `owner`/`name` or a login as written in an address; `invalid` when either cannot be a GitHub name. */
function projectRouteFrom(segments: readonly string[]): LearnProjectRoute | 'invalid' {
  let decoded: string[];
  try {
    decoded = segments.map(decodeURIComponent);
  } catch {
    return 'invalid';
  }
  return projectRouteOfNames(decoded) ?? 'invalid';
}

/**
 * The project a project course's page's segments name (`[owner]`, `[name]`, or `[login]`), in lower case as the API
 * names projects; null when they cannot name a GitHub project.
 */
export function learnProjectRouteOfSegments(segments: readonly string[]): LearnProjectRoute | null {
  const route = projectRouteFrom(segments);
  return route === 'invalid' ? null : { ...route, slug: route.slug.toLowerCase() };
}

const PROJECT_REPO_PAGE = /^\/learn\/repos\/([^/]+)\/([^/]+?)\/?$/;
const PROJECT_ORG_PAGE = /^\/learn\/orgs\/([^/]+?)\/?$/;

/**
 * The project a project course's page names, `/learn/repos/<owner>/<name>` or `/learn/orgs/<login>` (a trailing
 * slash allowed), for the proxy's gate: `invalid` for an address of that shape that cannot name a GitHub project (the
 * proxy answers the 404 itself, `_gone` among them); null for any other path.
 */
export function learnProjectCourseRouteOf(pathname: string): LearnProjectRoute | 'invalid' | null {
  const repo = PROJECT_REPO_PAGE.exec(pathname);
  if (repo) return projectRouteFrom([repo[1], repo[2]]);
  const org = PROJECT_ORG_PAGE.exec(pathname);
  return org ? projectRouteFrom([org[1]]) : null;
}

// A repository whose own name ends in `.md` reads as the copy of the one without it: the address cannot tell them
// apart without asking, and such a repository with a course is not worth a read on every copy.
const PROJECT_REPO_MARKDOWN = /^\/learn\/repos\/([^/]+)\/([^/]+)\.md$/;
const PROJECT_ORG_MARKDOWN = /^\/learn\/orgs\/([^/]+)\.md$/;

/** Where a project course's Markdown copy is answered from, since a page and a route handler cannot share a segment. */
export function learnProjectCourseMarkdownRoute(project: LearnProject): string {
  const parts = partsOf(project);
  return parts.kind === 'repo'
    ? `/api/learn/projects/repos/${repoSegments(parts)}/course.md`
    : `/api/learn/projects/orgs/${encodeURIComponent(parts.login)}/course.md`;
}

/**
 * Where the proxy answers a project course's Markdown copy from, for `/learn/repos/<owner>/<name>.md` and
 * `/learn/orgs/<login>.md` as `learnProjectCourseMarkdownPath` writes them; null for any other path, and for names
 * no GitHub project can have.
 */
export function learnProjectCourseMarkdownRouteOf(pathname: string): string | null {
  const repo = PROJECT_REPO_MARKDOWN.exec(pathname);
  const org = repo ? null : PROJECT_ORG_MARKDOWN.exec(pathname);
  const route = repo ? projectRouteFrom([repo[1], repo[2]]) : org ? projectRouteFrom([org[1]]) : null;
  return route && route !== 'invalid' ? learnProjectCourseMarkdownRoute(projectOfRoute(route)) : null;
}

/** A fix made with Learn, its "Learn from it" view: `/learn/fixes/<owner>/<repo>/<number>`. */
export function learnFixPath({ nameWithOwner, number }: PrRef): Route {
  const [owner = '', name = ''] = nameWithOwner.split('/');
  return `/learn/fixes/${repoSegments({ owner, name })}/${number}` as Route;
}

/** A fix's walkthrough, public once its pull request is open: `/learn/fixes/<owner>/<repo>/<number>/walkthrough`. */
export const learnFixWalkthroughPath = (pr: PrRef) => `${learnFixPath(pr)}/walkthrough` as Route;

/** A person's answers to a fix's walkthrough: `…/walkthrough/by/<login>`. */
export const learnFixAnswersPath = (pr: PrRef, login: string) =>
  `${learnFixWalkthroughPath(pr)}/by/${encodeURIComponent(login)}` as Route;

/**
 * The fixer's answers by the attempt that made the fix, the link a Learn pull request's footer gives (it is written
 * before the pull request has a number): a route that only redirects to the answers page once the pull request is open.
 */
export const learnFixAnswersByAttemptPath = (attemptId: string) =>
  `/learn/fixes/by-attempt/${encodeURIComponent(attemptId)}/answers` as Route;

/**
 * Where the proxy shows a fix whose page was removed, with its status: `_removed` is no GitHub owner's shape, so no
 * fix is ever under it.
 */
export function learnFixRemovedPath({ nameWithOwner, number }: PrRef): Route {
  const [owner = '', name = ''] = nameWithOwner.split('/');
  return `/learn/fixes/_removed/${repoSegments({ owner, name })}/${number}` as Route;
}

/**
 * Where the browser reads the signed-in person's side of a fix; with `answersOf`, the login of an answers page, their
 * own answers too, which the route reads only when that login is the person's own.
 */
export function learnFixMinePath({ nameWithOwner, number }: PrRef, { answersOf }: { answersOf?: string } = {}): string {
  const [owner = '', name = ''] = nameWithOwner.split('/');
  const query = answersOf ? `?${new URLSearchParams({ answers: answersOf })}` : '';
  return `/api/me/learn/fixes/${repoSegments({ owner, name })}/${number}${query}`;
}

/** Where the browser reads the signed-in person's marks on a fix's page, with their similar issues. */
export const learnFixMarksPath = (pr: PrRef) => `${learnFixMinePath(pr)}/marks`;

const FIX_VIEW = /^\/learn\/fixes\/([^/]+)\/([^/]+)\/([^/]+)\/?$/;
const FIX_PAGE = /^\/learn\/fixes\/([^/]+)\/([^/]+)\/([^/]+)\/walkthrough(?:\/by\/([^/]+))?\/?$/;
const FIX_LOGIN = new RegExp(`^${GITHUB_LOGIN}$`);
const BY_ATTEMPT_PAGE = /^\/learn\/fixes\/by-attempt\/([^/]+)\/answers\/?$/;
const REMOVED_PAGE = /^\/learn\/fixes\/_removed(?:\/|$)/;

/** A fix's walkthrough or a person's answers, as the proxy's gate asks about them. */
export type LearnFixRoute = { pr: PrRef; login: string | null };

/**
 * The fix a walkthrough's or an answers page's address names, for the proxy's gate: `/learn/fixes/<owner>/<repo>/
 * <number>/walkthrough` and `…/by/<login>`, a trailing slash allowed. `invalid` for an address of that shape that
 * cannot name a pull request (`057`, `x1`) or a login (the proxy answers the 404 itself, never the page's 200); null
 * for any other path.
 */
export function learnFixRouteOf(pathname: string): LearnFixRoute | 'invalid' | null {
  const match = FIX_PAGE.exec(pathname);
  if (!match) return null;
  const [, owner, repo, number, login] = match;
  let decoded: string[];
  try {
    decoded = [owner, repo, login ?? ''].map(decodeURIComponent);
  } catch {
    return 'invalid';
  }
  const pr = parsePrLink(`${decoded[0]}/${decoded[1]}#${number}`);
  if (!pr || String(pr.number) !== number) return 'invalid';
  if (login !== undefined && !FIX_LOGIN.test(decoded[2])) return 'invalid';
  return { pr, login: login === undefined ? null : decoded[2] };
}

/**
 * The fix a fix page's address names, `/learn/fixes/<owner>/<repo>/<number>`, a trailing slash allowed, for the
 * proxy's gate: `invalid` for an address of that shape that cannot name a pull request (the proxy answers the 404
 * itself), null for any other path. The removed fixes' page and the footer's address by attempt are never one.
 */
export function learnFixViewOf(pathname: string): PrRef | 'invalid' | null {
  const match = FIX_VIEW.exec(pathname);
  if (!match || REMOVED_PAGE.test(pathname)) return null;
  const [, owner, repo, number] = match;
  if (owner === 'by-attempt') return 'invalid';
  let decoded: string[];
  try {
    decoded = [owner, repo].map(decodeURIComponent);
  } catch {
    return 'invalid';
  }
  const pr = parsePrLink(`${decoded[0]}/${decoded[1]}#${number}`);
  return pr && String(pr.number) === number ? pr : 'invalid';
}

/**
 * The attempt of the footer's address, `/learn/fixes/by-attempt/<id>/answers`; `invalid` for that shape with an id
 * of no attempt's shape, null for any other path.
 */
export function learnFixByAttemptOf(pathname: string): { attemptId: string } | 'invalid' | null {
  const match = BY_ATTEMPT_PAGE.exec(pathname);
  if (!match) return null;
  return ATTEMPT_ID.test(match[1]) ? { attemptId: match[1] } : 'invalid';
}

/** Whether a path is under the removed fixes' page, which only the proxy's own rewrite may show. */
export const isLearnFixRemovedPath = (pathname: string) => REMOVED_PAGE.test(pathname);

/** "Report a mistake" on a lesson: an email to us, its subject naming the lesson. */
export const lessonMistakeHref = (title: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`A mistake in the lesson "${title}"`)}`;

/**
 * The query a link from Learn adds to a page both products share (Settings, the pull requests, the Agent page), so the
 * page shows Learn's bar.
 */
export const FROM_LEARN = 'learn';

/** A shared page's address as Learn links to it: `?from=learn`, before the hash. */
export function fromLearn(path: string): Route {
  const [base, hash] = path.split('#', 2);
  const joined = `${base}${base.includes('?') ? '&' : '?'}from=${FROM_LEARN}`;
  return (hash === undefined ? joined : `${joined}#${hash}`) as Route;
}

/** Settings, reached from Learn. */
export const LEARN_SETTINGS_PATH = fromLearn('/my/settings');
/** Learn's group in Settings: its anchor, and the address that lands on it from Learn. */
export const LEARN_PREFERENCES_ID = 'learn-preferences';
export const LEARN_PREFERENCES_PATH = fromLearn(`/my/settings#${LEARN_PREFERENCES_ID}`);
/** The person's pull requests, reached from Learn. */
export const LEARN_PULL_REQUESTS_PATH = fromLearn('/my/pull-requests');

/** The cache tag of every page that lists the courses. */
export const LEARN_COURSES_TAG = 'learn:courses';
/** A course's cache tag: its page, and every lesson's page in it. */
export const learnCourseTag = (slug: string) => `learn:course:${slug}`;
/** A lesson's cache tag. */
export const learnLessonTag = (slug: string) => `learn:lesson:${slug}`;
/** The cache tag of every list of merged fixes. */
export const LEARN_FIXES_TAG = 'learn:fixes';
/**
 * One fix's cache tag, by its pull request, in lower case (GitHub's names are not case-sensitive): every public page
 * of the fix carries it, its two views, its walkthrough and its answers page.
 */
export const learnFixTag = ({ nameWithOwner, number }: PrRef) => `learn:fix:${nameWithOwner.toLowerCase()}#${number}`;

/**
 * The cache tag of a project's Learn card, on its repository's or its organisation's page:
 * `learn:entity:repo:<owner>/<name>` or `learn:entity:org:<login>`, in lower case (GitHub's names are not
 * case-sensitive, and an address keeps the case the visitor typed).
 */
export function learnEntityTag(project: LearnProject): string {
  const parts = partsOf(project);
  return parts.kind === 'repo'
    ? `learn:entity:repo:${parts.owner.toLowerCase()}/${parts.name.toLowerCase()}`
    : `learn:entity:org:${parts.login.toLowerCase()}`;
}

/**
 * A Learn card's tag as the API sends it: lower case, a login of GitHub's characters (up to 39, older logins with
 * hyphens anywhere), and a repository's name of up to 100 of its characters, never `.` or `..`.
 */
const ENTITY_TAG = /^learn:entity:(?:repo:[a-z0-9-]{1,39}\/(?!\.\.?$)[a-z0-9._-]{1,100}|org:[a-z0-9-]{1,39})$/;

/** A course's or a lesson's slug as the content writes it: lower-case words joined by single hyphens. */
const CONTENT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;

/** Whether a slug is one a course or a lesson of ours can have: asked of the API only then. */
export const isContentSlug = (slug: string): boolean => slug.length <= SLUG_MAX_LENGTH && CONTENT_SLUG.test(slug);

const LESSON_MARKDOWN = /^\/learn\/lessons\/([^/]+)\.md$/;

/**
 * Where the proxy answers a lesson's Markdown copy from, for `/learn/lessons/<slug>.md` with a slug of a lesson's shape
 * as `learnLessonMarkdownPath` writes it; null for any other path.
 */
export function learnLessonMarkdownRouteOf(pathname: string): string | null {
  const slug = LESSON_MARKDOWN.exec(pathname)?.[1];
  return slug !== undefined && isContentSlug(slug) ? learnLessonMarkdownRoute(slug) : null;
}

const COURSE_MARKDOWN = /^\/learn\/courses\/([^/]+)\.md$/;

/**
 * Where the proxy answers a course's Markdown copy, or that of all courses, from: for `/learn/courses.md`, and for
 * `/learn/courses/<slug>.md` with a slug of a course's shape as `courseMarkdownPath` writes it; null for any other path.
 */
export function learnCourseMarkdownRouteOf(pathname: string): string | null {
  if (pathname === LEARN_COURSES_MARKDOWN_PATH) return LEARN_COURSES_MARKDOWN_ROUTE;
  const slug = COURSE_MARKDOWN.exec(pathname)?.[1];
  return slug !== undefined && isContentSlug(slug) ? learnCourseMarkdownRoute(slug) : null;
}

/** Where the proxy answers the Markdown copies of Issues and of a lesson's and a course's view of it from. */
export const LEARN_ISSUES_MARKDOWN_ROUTE = '/api/learn/issues.md';

const LESSON_VIEW_MARKDOWN = /^\/learn\/lessons\/([^/]+)\/real-world\.md$/;
const COURSE_VIEW_MARKDOWN = /^\/learn\/courses\/([^/]+)\/real-world\.md$/;

/**
 * Where the proxy answers a view's Markdown copy from: `/learn/issues.md` with its query carried (`?language=go`),
 * and `/learn/lessons/<slug>/real-world.md` and `/learn/courses/<slug>/real-world.md` with the lesson or the course
 * and the page they belong to (`at`); null for any other path, and for a slug of no content's shape.
 */
export function learnIssuesMarkdownRouteOf(pathname: string, search = ''): string | null {
  const query = new URLSearchParams(search);
  query.delete('at');
  if (pathname === markdownPathOf(LEARN_ISSUES_PATH)) {
    const rest = query.toString();
    return rest ? `${LEARN_ISSUES_MARKDOWN_ROUTE}?${rest}` : LEARN_ISSUES_MARKDOWN_ROUTE;
  }
  const lesson = LESSON_VIEW_MARKDOWN.exec(pathname)?.[1];
  const course = COURSE_VIEW_MARKDOWN.exec(pathname)?.[1];
  const slug = lesson ?? course;
  if (slug === undefined || !isContentSlug(slug)) return null;
  const at = lesson !== undefined ? 'lesson' : 'course';
  query.set(at, slug);
  query.set('at', at);
  return `${LEARN_ISSUES_MARKDOWN_ROUTE}?${query}`;
}

const COURSE_PAGE = /^\/learn\/courses\/([^/]+)\/?$/;

/**
 * The segment under `/learn/courses/` that is not a course's page: the picture of all courses, a route handler.
 * `_gone` and `_missing` are asked like any other: not a slug's shape, they are missing without asking the API, so
 * reached directly they get the real 404.
 */
const NOT_A_COURSE = new Set(['card.png']);

const CHECK_PAGE = /^\/learn\/check\/([^/]+)\/?$/;

/**
 * The course asked for by a course's check, `/learn/check/<segment>` (a trailing slash allowed), for the proxy's gate:
 * the segment as written, which the gate answers as missing when it is not a slug's shape; null for any other path.
 */
export function checkRouteOf(pathname: string): string | null {
  return CHECK_PAGE.exec(pathname)?.[1] ?? null;
}

/**
 * The course asked for by a course's page, `/learn/courses/<segment>` (a trailing slash allowed), for the proxy's
 * gate: the segment as written, which the gate answers as missing when it is not a slug's shape; null for any other
 * path, and for the segments that are not a course.
 */
export function courseRouteOf(pathname: string): string | null {
  const segment = COURSE_PAGE.exec(pathname)?.[1];
  return segment !== undefined && !NOT_A_COURSE.has(segment) ? segment : null;
}

/**
 * A fix's cache tag as the API may send it, `learn:fix:<owner>/<repo>#<number>` in any case, written the way the
 * fix's pages carry it; null for anything else.
 */
export function learnFixTagOf(tag: string): string | null {
  const ref = /^learn:fix:(.*)$/s.exec(tag)?.[1];
  const pr = ref === undefined ? null : parsePrLink(ref);
  return pr && ref === `${pr.nameWithOwner}#${pr.number}` ? learnFixTag(pr) : null;
}

/**
 * A Learn cache tag as the API sends it to expire: `learn:courses`, a course's, a lesson's, `learn:fixes`, a fix's
 * (see `learnFixTagOf`), or a project's Learn card's (see `learnEntityTag`).
 */
export function isLearnTag(tag: string): boolean {
  if (tag === LEARN_COURSES_TAG || tag === LEARN_FIXES_TAG) return true;
  if (learnFixTagOf(tag) !== null || ENTITY_TAG.test(tag)) return true;
  const slug = /^learn:(?:course|lesson):(.*)$/s.exec(tag)?.[1];
  return slug !== undefined && isContentSlug(slug);
}
