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

/** Where the browser reads the signed-in person's side of a lesson, and of a course. */
export const learnLessonMinePath = (slug: string) => `/api/me/learn/lessons/${encodeURIComponent(slug)}`;
export const learnCourseMinePath = (slug: string) => `/api/me/learn/courses/${encodeURIComponent(slug)}`;

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

/** A Learn cache tag as the API sends it to expire: `learn:courses`, a course's or a lesson's. */
export function isLearnTag(tag: string): boolean {
  if (tag === LEARN_COURSES_TAG) return true;
  const slug = /^learn:(?:course|lesson):(.*)$/s.exec(tag)?.[1];
  return slug !== undefined && isContentSlug(slug);
}
