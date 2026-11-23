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

/** One course's page. */
export const coursePath = (slug: string) => `/learn/courses/${encodeURIComponent(slug)}` as Route;
/** The check of one course. */
export const checkPath = (course: string) => `/learn/check/${encodeURIComponent(course)}` as Route;
/** A lesson's page. */
export const learnLessonPath = (slug: string) => `/learn/lessons/${encodeURIComponent(slug)}` as Route;

/** A page's Markdown copy: the page's own address with `.md`. */
export const markdownPathOf = (path: string) => `${path}.md`;

/** A lesson's Markdown copy. */
export const learnLessonMarkdownPath = (slug: string) => markdownPathOf(learnLessonPath(slug)) as Route;

/** A lesson's fun fact: the lesson's page with "Did you know?" open, the address its Share button copies. */
export const learnFactPath = (slug: string) => `${learnLessonPath(slug)}?fact` as Route;

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

/** A Learn cache tag as the API sends it to expire: `learn:courses`, a course's or a lesson's. */
export function isLearnTag(tag: string): boolean {
  if (tag === LEARN_COURSES_TAG) return true;
  const slug = /^learn:(?:course|lesson):(.*)$/s.exec(tag)?.[1];
  return slug !== undefined && slug.length <= SLUG_MAX_LENGTH && CONTENT_SLUG.test(slug);
}
