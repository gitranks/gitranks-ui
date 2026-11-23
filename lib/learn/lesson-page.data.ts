import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { LearnAddress, LearnAddressKind } from './address-gate';
import type { HighlightedCode } from './code-tokens';
import { highlightCodes } from './highlight';
import type {
  HighlightedExample,
  LearnCourseGroup,
  LearnGroupLesson,
  LearnLesson,
  LearnLessonMine,
} from './lesson-page';
import {
  LearnAddressDocument,
  LearnCourseGroupsDocument,
  type LearnCourseLessonMine,
  LearnCourseMineDocument,
  LearnLessonDocument,
  LearnLessonMineDocument,
} from './lesson-page.documents';
import { isContentSlug, learnCourseTag, learnLessonTag } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';

/*
 * A lesson's page in two layers. The public one is the same for everyone and read with no session: cached for hours
 * under the lesson's tag and its course's, which the API expires when either changes. The personal one is read for the
 * signed-in person only, in the browser, through the route handlers, and never kept.
 */

/** Everything the public layer of a lesson's page draws: the lesson, its code highlighted, its group's lessons. */
export type LearnLessonPage = {
  lesson: LearnLesson;
  examples: HighlightedExample[];
  questionCodes: HighlightedCode[];
  group: LearnGroupLesson[];
};

/** A read the API says it cannot answer: an unknown slug, a bad ask, or a field it does not know yet. */
const isMissingAnswer = (failure: unknown) => {
  const { error } = contributeErrorOf(failure);
  return error === 'NOT_FOUND' || error === 'INVALID' || error === 'NOT_AVAILABLE_YET';
};

/** A course's groups, in order; cached under the course's tag. A failed read throws, and nothing is kept. */
export async function loadLearnCourseGroups(course: string): Promise<LearnCourseGroup[] | null> {
  'use cache';
  cacheTag(learnCourseTag(course));
  cacheLife('hours');
  if (!isContentSlug(course)) return null;
  const { learnCourse } = await graphqlDirect(LearnCourseGroupsDocument, { slug: course }, { source: 'ssr' });
  return learnCourse?.groups ?? null;
}

/**
 * A lesson of ours as everyone reads it, with its examples and its question's code highlighted and its group's
 * lessons; null when the slug is not a live lesson of ours (a lesson of a fix, perhaps). Kept for hours under the
 * lesson's and its course's tags; a null, or a page whose group could not be read, only for minutes, so a deploy in
 * between or a passing failure is not kept long. A failed read of the lesson throws: nothing is kept.
 */
export async function loadLearnLessonPage(slug: string): Promise<LearnLessonPage | null> {
  'use cache';
  cacheTag(learnLessonTag(slug));
  if (!isContentSlug(slug)) {
    cacheLife('hours');
    return null;
  }
  let lesson: LearnLesson | null;
  try {
    ({ learnLesson: lesson } = await graphqlDirect(LearnLessonDocument, { slug }, { source: 'ssr' }));
  } catch (failure) {
    if (!isMissingAnswer(failure)) throw failure;
    lesson = null;
  }
  if (!lesson) {
    cacheLife('minutes');
    return null;
  }
  cacheTag(learnCourseTag(lesson.course.slug));
  const [examples, questionCodes, groups] = await Promise.all([
    Promise.all(
      lesson.examples.map(async (example) => ({ name: example.name, codes: await highlightCodes(example.codes) })),
    ),
    highlightCodes(lesson.question.codes),
    loadLearnCourseGroups(lesson.course.slug).catch(() => null),
  ]);
  const group = groups?.find((entry) => entry.slug === lesson.group.slug)?.lessons ?? null;
  if (group) cacheLife('hours');
  else cacheLife('minutes');
  return { lesson, examples, questionCodes, group: group ?? [] };
}

/**
 * What a lesson's or a course's address answers, for the page of a paused or removed one: kept for hours under its
 * tag, which a pause, a removal and a return expire. A failed read throws.
 */
export async function loadLearnAddress(kind: LearnAddressKind, slug: string): Promise<LearnAddress | null> {
  'use cache';
  cacheTag(kind === 'lesson' ? learnLessonTag(slug) : learnCourseTag(slug));
  cacheLife('hours');
  if (!isContentSlug(slug)) return null;
  const { learnAddress } = await graphqlDirect(LearnAddressDocument, { kind, slug }, { source: 'ssr' });
  return learnAddress ?? null;
}

/**
 * The signed-in person's side of a lesson: null when Learn is not open to them, and on any failure. Never kept. The
 * API keeps no language for the answer, so none is known here.
 */
export async function loadLearnLessonMine(slug: string, githubLogin: string): Promise<LearnLessonMine | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const { learnLessonMine } = await graphqlDirect(LearnLessonMineDocument, { slug }, { source: 'ssr', githubLogin });
    return learnLessonMine ? { ...learnLessonMine, language: null } : null;
  } catch {
    return null;
  }
}

/** The signed-in person's side of a course, each lesson's depth: null when Learn is not open to them, and on failure. */
export async function loadLearnCourseMine(
  slug: string,
  githubLogin: string,
): Promise<{ slug: string; lessons: LearnCourseLessonMine[] } | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const { learnCourseMine } = await graphqlDirect(LearnCourseMineDocument, { slug }, { source: 'ssr', githubLogin });
    return learnCourseMine ?? null;
  } catch {
    return null;
  }
}
