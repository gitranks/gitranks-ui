import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { isAddressSlug, type LearnAddress, type LearnAddressKind } from './address-gate';
import type { LearnCourseMine } from './course';
import type {
  HighlightedExample,
  LearnCourseGroup,
  LearnGroupLesson,
  LearnLesson,
  LearnLessonMine,
  LearnLessonProject,
} from './lesson-page';
import {
  LearnAddressDocument,
  LearnCourseGroupsDocument,
  LearnCourseMineDocument,
  LearnLessonDocument,
  LearnLessonMineDocument,
} from './lesson-page.documents';
import { isContentSlug, LEARN_COURSES_TAG, learnCourseTag, learnLessonTag } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import { contributeErrorOf } from '@/lib/workspace/errors';
import { highlightCodes } from '@/lib/workspace/highlight';

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

/** A course's groups in order, and a project course's project (null for any other course). */
export type LearnCourseOutline = { groups: LearnCourseGroup[]; project: LearnLessonProject | null };

/**
 * A course's groups, in order, with a project course's name; cached under the course's tag: for hours when it has
 * groups, for minutes when it has none (a course not live yet, or a deploy in between), so the squares come back soon.
 * Null with no group. A failed read throws, and nothing is kept.
 */
export async function loadLearnCourseOutline(course: string): Promise<LearnCourseOutline | null> {
  'use cache';
  cacheTag(learnCourseTag(course));
  if (!isContentSlug(course)) {
    cacheLife('hours');
    return null;
  }
  const { learnCourse } = await graphqlDirect(LearnCourseGroupsDocument, { slug: course }, { source: 'ssr' });
  const groups = learnCourse?.groups ?? [];
  if (groups.length) cacheLife('hours');
  else cacheLife('minutes');
  const project = learnCourse?.project;
  return groups.length
    ? {
        groups,
        project: project?.name ? { name: project.name, repo: project.repo ?? null, org: project.org ?? null } : null,
      }
    : null;
}

/** A course's groups, in order (`loadLearnCourseOutline`); null with none. */
export async function loadLearnCourseGroups(course: string): Promise<LearnCourseGroup[] | null> {
  return (await loadLearnCourseOutline(course))?.groups ?? null;
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
  const [highlighted, questionCodes, outline] = await Promise.all([
    Promise.all(
      lesson.examples.map(async (example) => ({
        name: example.name,
        codes: await highlightCodes(example.codes),
        source: example.source ?? null,
      })),
    ),
    highlightCodes(lesson.question.codes),
    loadLearnCourseOutline(lesson.course.slug).catch(() => null),
  ]);
  // A project course's lesson carries its project, when the course could be read: its links lead to the project's
  // address, and a quote names the project.
  const project = outline?.project ?? null;
  const examples = highlighted.map((example) =>
    example.source ? { ...example, project: project?.name ?? null } : example,
  );
  const group = outline?.groups.find((entry) => entry.slug === lesson.group.slug)?.lessons ?? null;
  if (group) cacheLife('hours');
  else cacheLife('minutes');
  const read = project ? { ...lesson, course: { ...lesson.course, project } } : lesson;
  return { lesson: read, examples, questionCodes, group: group ?? [] };
}

/**
 * What a lesson's, a course's or a project course's address answers, for the page of a paused or removed one: kept
 * for hours under its tag, which a pause, a removal and a return expire (a project's, under the list's tag, which
 * every change of the content expires). A failed read throws.
 */
export async function loadLearnAddress(kind: LearnAddressKind, slug: string): Promise<LearnAddress | null> {
  'use cache';
  cacheTag(kind === 'lesson' ? learnLessonTag(slug) : kind === 'course' ? learnCourseTag(slug) : LEARN_COURSES_TAG);
  cacheLife('hours');
  if (!isAddressSlug(kind, slug)) return null;
  const { learnAddress } = await graphqlDirect(LearnAddressDocument, { kind, slug }, { source: 'ssr' });
  return learnAddress ?? null;
}

/**
 * The signed-in person's side of a lesson, with the language its last answer was given in: null when Learn is not open
 * to them, and on any failure. Never kept.
 */
export async function loadLearnLessonMine(slug: string, githubLogin: string): Promise<LearnLessonMine | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const { learnLessonMine } = await graphqlDirect(LearnLessonMineDocument, { slug }, { source: 'ssr', githubLogin });
    return learnLessonMine ?? null;
  } catch {
    return null;
  }
}

/**
 * The signed-in person's side of a course, whole (each lesson's depth among it): null when Learn is not open to them,
 * and on failure. Never kept.
 */
export async function loadLearnCourseMine(slug: string, githubLogin: string): Promise<LearnCourseMine | null> {
  if (!isContentSlug(slug)) return null;
  try {
    const { learnCourseMine } = await graphqlDirect(LearnCourseMineDocument, { slug }, { source: 'ssr', githubLogin });
    return learnCourseMine ?? null;
  } catch {
    return null;
  }
}
