import type { Route } from 'next';

import { CONTACT_EMAIL } from '@/lib/legal';

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

/** A page's Markdown copy: the page's own address with `.md`. */
export const markdownPathOf = (path: string) => `${path}.md`;

/** The Markdown copy of a course, and of all courses. */
export const courseMarkdownPath = (slug: string) => markdownPathOf(coursePath(slug));
export const LEARN_COURSES_MARKDOWN_PATH = `${LEARN_COURSES_PATH}.md`;

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
/** The query that asks the depth of each lesson in some of the person's courses, by their slugs, comma-separated. */
export const COURSE_DEPTHS_QUERY = 'depths';
/** Where the browser reads the depth of each lesson in the given courses of the person. */
export const learnCourseDepthsPath = (courses: readonly string[]) =>
  `${LEARN_COURSES_MINE_PATH}?${COURSE_DEPTHS_QUERY}=${courses.map(encodeURIComponent).join(',')}`;
/** The query a course's page adds to ask whether the check leads it; the route reads the level only then. */
export const CHECK_FIRST_QUERY = 'check';
/** The person's side of a course as the course's page asks it: with whether the check leads the page. */
export const learnCourseSidePath = (slug: string) => `${learnCourseMinePath(slug)}?${CHECK_FIRST_QUERY}=1`;

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

/** A Learn cache tag as the API sends it to expire: `learn:courses`, a course's or a lesson's. */
export function isLearnTag(tag: string): boolean {
  if (tag === LEARN_COURSES_TAG) return true;
  const slug = /^learn:(?:course|lesson):(.*)$/s.exec(tag)?.[1];
  return slug !== undefined && isContentSlug(slug);
}
