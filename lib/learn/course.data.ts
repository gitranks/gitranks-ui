import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type {
  LearnCourse,
  LearnCourseCard,
  LearnCourseMineCard,
  LearnLessonFixesListed,
  LearnLessonListItem,
} from './course';
import {
  LearnCourseDocument,
  LearnCoursesDocument,
  LearnCoursesMineDocument,
  LearnLessonsDocument,
  LearnLessonsFixesListedDocument,
  LearnProjectCourseDocument,
  LearnProjectOpenIssuesDocument,
  LearnSetupLevelDocument,
} from './course.documents';
import type { LearnDepth } from './lesson-page';
import { loadLearnCourseMine } from './lesson-page.data';
import { isContentSlug, LEARN_COURSES_TAG, type LearnProject, learnCourseTag } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';

/*
 * All courses and a course in two layers. The public one is the same for everyone and read with no session: cached
 * for hours under the list's tag or the course's, which the API expires when the content changes. The personal one is
 * read for the signed-in person only, in the browser, through the route handlers, and never kept.
 */

/** A read the API says it cannot answer: an unknown slug, a bad ask, or a field it does not know yet. */
const isMissingAnswer = (failure: unknown) => {
  const { error } = contributeErrorOf(failure);
  return error === 'NOT_FOUND' || error === 'INVALID' || error === 'NOT_AVAILABLE_YET';
};

/**
 * Every live course, as the list shows them; cached under the list's tag: for hours when there are some, for minutes
 * when there are none (no course live yet, or a deploy in between). A failed read throws, and nothing is kept.
 */
export async function loadLearnCourses(): Promise<LearnCourseCard[]> {
  'use cache';
  cacheTag(LEARN_COURSES_TAG);
  const { learnCourses } = await graphqlDirect(LearnCoursesDocument, {}, { source: 'ssr' });
  if (learnCourses.length) cacheLife('hours');
  else cacheLife('minutes');
  return learnCourses;
}

/** Every live lesson, for the search of all courses; cached as the courses are, under the list's tag. */
export async function loadLearnLessons(): Promise<LearnLessonListItem[]> {
  'use cache';
  cacheTag(LEARN_COURSES_TAG);
  const { learnLessons } = await graphqlDirect(LearnLessonsDocument, {}, { source: 'ssr' });
  if (learnLessons.length) cacheLife('hours');
  else cacheLife('minutes');
  return learnLessons;
}

/**
 * Which live lessons have a listed merged fix, for the sitemap: its own read under the list's tag, purged with the
 * content. Kept for hours (a lesson's view reaches the sitemap within hours of its first merged fix) when it says
 * something. A failed read throws; so does an answer where no lesson's `fixesListed` is known (the API could not read
 * its fixes), so nothing is kept and the sitemap reads again soon.
 */
export async function loadLearnLessonsFixesListed(): Promise<LearnLessonFixesListed[]> {
  'use cache';
  cacheTag(LEARN_COURSES_TAG);
  const { learnLessons } = await graphqlDirect(LearnLessonsFixesListedDocument, {}, { source: 'ssr' });
  if (learnLessons.length && learnLessons.every((lesson) => lesson.fixesListed === null)) {
    throw new Error('No lesson says whether it has a listed merged fix');
  }
  if (learnLessons.length) cacheLife('hours');
  else cacheLife('minutes');
  return learnLessons;
}

/**
 * A live course of ours, whole; null when the slug is not one. Kept for hours under the course's tag and the list's
 * (the course after it is named on the page, with its numbers); a null only for minutes, so a deploy in between is not
 * kept long. A failed read throws: nothing is kept.
 */
export async function loadLearnCourse(slug: string): Promise<LearnCourse | null> {
  'use cache';
  cacheTag(learnCourseTag(slug), LEARN_COURSES_TAG);
  if (!isContentSlug(slug)) {
    cacheLife('hours');
    return null;
  }
  let course: LearnCourse | null;
  try {
    ({ learnCourse: course } = await graphqlDirect(LearnCourseDocument, { slug }, { source: 'ssr' }));
  } catch (failure) {
    if (!isMissingAnswer(failure)) throw failure;
    course = null;
  }
  if (course) cacheLife('hours');
  else cacheLife('minutes');
  return course;
}

/**
 * A live project course, whole, by its project in lower case: null when the project has none. Kept as a course is,
 * for hours under its course's tag (known once read) and the list's; a null only for minutes, under the list's tag. A
 * failed read throws: nothing is kept. Its open issues are not part of it (`loadLearnProjectOpenIssues`).
 */
export async function loadLearnProjectCourse(project: LearnProject): Promise<LearnCourse | null> {
  'use cache';
  cacheTag(LEARN_COURSES_TAG);
  let course: LearnCourse | null;
  try {
    ({ learnProjectCourse: course } = await graphqlDirect(LearnProjectCourseDocument, project, { source: 'ssr' }));
  } catch (failure) {
    if (!isMissingAnswer(failure)) throw failure;
    course = null;
  }
  if (course) {
    cacheTag(learnCourseTag(course.slug));
    cacheLife('hours');
  } else cacheLife('minutes');
  return course;
}

/**
 * A project course's open issues to fix, read apart from the course, whose cache lives until the content changes:
 * kept for minutes only. Null for none, and when the read fails (decided inside, so a failure is never thrown out of
 * the kept read and the page shows no count).
 */
export async function loadLearnProjectOpenIssues(project: LearnProject): Promise<number | null> {
  'use cache';
  cacheLife('minutes');
  try {
    const { learnProjectCourse } = await graphqlDirect(LearnProjectOpenIssuesDocument, project, { source: 'ssr' });
    const count = learnProjectCourse?.openIssues;
    return typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : null;
  } catch {
    return null;
  }
}

/** The person's level, from their setup or our guess of it: null when there is none, Learn is not open, or on failure. */
export async function loadLearnLevel(githubLogin: string): Promise<number | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(LearnSetupLevelDocument, {}, { source: 'ssr', githubLogin });
    return learnSetupOfMine?.level ?? null;
  } catch {
    return null;
  }
}

/**
 * The signed-in person's courses, for their figure and bar on each card: null when Learn is not open to them, and on
 * any failure. One read, whatever the number of courses. Never kept.
 */
export async function loadLearnCoursesMine(githubLogin: string): Promise<LearnCourseMineCard[] | null> {
  try {
    const { learnCoursesMine } = await graphqlDirect(LearnCoursesMineDocument, {}, { source: 'ssr', githubLogin });
    return learnCoursesMine ?? null;
  } catch {
    return null;
  }
}

/** The most courses one ask of the depths reads: more than there are courses. */
export const COURSE_DEPTHS_MAX = 50;

/**
 * The depth of each lesson in the given courses of the person, for the squares of the lessons a search finds: read
 * only once a search shows a lesson of a course they started, one read a course. Null when any of them fails (the
 * squares keep their places). Never kept.
 */
export async function loadLearnCourseDepths(
  githubLogin: string,
  courses: readonly string[],
): Promise<Record<string, LearnDepth> | null> {
  const sides = await Promise.all(courses.map((slug) => loadLearnCourseMine(slug, githubLogin)));
  if (sides.some((side) => side === null)) return null;
  const depths: Record<string, LearnDepth> = {};
  for (const side of sides) for (const lesson of side?.lessons ?? []) depths[lesson.slug] = lesson.depth;
  return depths;
}
