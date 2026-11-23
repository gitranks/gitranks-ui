import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { LearnCourse, LearnCourseCard, LearnCourseMineCard, LearnLessonListItem } from './course';
import {
  LearnCourseDocument,
  LearnCoursesDocument,
  LearnCoursesMineDocument,
  LearnLessonsDocument,
  LearnSetupLevelDocument,
} from './course.documents';
import type { LearnDepth } from './lesson-page';
import { loadLearnCourseMine } from './lesson-page.data';
import { isContentSlug, LEARN_COURSES_TAG, learnCourseTag } from './paths';
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

/** The person's level, from their setup or our guess of it: null when there is none, Learn is not open, or on failure. */
export async function loadLearnLevel(githubLogin: string): Promise<number | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(LearnSetupLevelDocument, {}, { source: 'ssr', githubLogin });
    return learnSetupOfMine?.level ?? null;
  } catch {
    return null;
  }
}

/** The signed-in person's side of all courses, as the list draws it. */
export type LearnCoursesMine = {
  courses: LearnCourseMineCard[];
  /** Each lesson's depth in their courses, for the squares of the lessons found; null when one could not be read. */
  depths: Record<string, LearnDepth> | null;
};

/**
 * The signed-in person's courses and the depth of each lesson in them: null when Learn is not open to them, and on
 * any failure. A lesson of a course they never opened is not started, so only their own courses are read; when one of
 * them fails, the depths are left out (the squares keep their places) and the courses still show. Never kept.
 */
export async function loadLearnCoursesMine(githubLogin: string): Promise<LearnCoursesMine | null> {
  let courses: LearnCourseMineCard[] | null;
  try {
    ({ learnCoursesMine: courses } = await graphqlDirect(LearnCoursesMineDocument, {}, { source: 'ssr', githubLogin }));
  } catch {
    return null;
  }
  if (!courses) return null;
  const sides = await Promise.all(courses.map((card) => loadLearnCourseMine(card.course.slug, githubLogin)));
  if (sides.some((side) => side === null)) return { courses, depths: null };
  const depths: Record<string, LearnDepth> = {};
  for (const side of sides) for (const lesson of side?.lessons ?? []) depths[lesson.slug] = lesson.depth;
  return { courses, depths };
}
