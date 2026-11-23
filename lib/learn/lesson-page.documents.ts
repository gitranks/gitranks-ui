import { parse } from 'graphql';

import type { LearnAddress } from './address-gate';
import type { LearnCourseMine } from './course';
import type { LearnCourseGroup, LearnDepth, LearnLesson, LearnLessonLink, LearnLessonMine } from './lesson-page';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The reads and writes of a lesson's page: the lesson and its course's groups as everyone reads them, what its address
 * answers, and the signed-in person's side of the lesson and of its course; their answer and their rating.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
const CODES = 'codes { language code }';

/** The person's side of a lesson as the API answers it, with the language of the last answer kept. */
export type LearnLessonMineRead = LearnLessonMine;
const MINE = 'depth known learnedAt dueAt picked language tries feedbackGood';

/** A lesson, whole, key included: the same for everyone. Null when it is not live, or not one of ours. */
export const LearnLessonDocument = doc<{ learnLesson: LearnLesson | null }, { slug: string }>(
  `query LearnLesson($slug: String!) {
    learnLesson(slug: $slug) {
      slug title level body
      course { ${LINK} } group { ${LINK} }
      examples { name ${CODES} }
      visuals
      question { id type prompt example visual content ${CODES} }
      say fact { title text source url } deeper
      buildsOn { ${LINK} } previous { ${LINK} } next { ${LINK} }
      changedAt publishedAt
    }
  }`,
);

/** A course's groups and their lessons, in order: where a lesson sits in its group. */
export const LearnCourseGroupsDocument = doc<
  { learnCourse: { slug: string; groups: LearnCourseGroup[] } | null },
  { slug: string }
>(
  'query LearnCourseGroups($slug: String!) { learnCourse(slug: $slug) { slug groups { slug name lessons { slug title level paused } } } }',
);

/** What a lesson's or a course's address answers. */
export const LearnAddressDocument = doc<{ learnAddress: LearnAddress | null }, { kind: string; slug: string }>(
  `query LearnAddress($kind: String!, $slug: String!) { learnAddress(kind: $kind, slug: $slug) { state movedTo title course { ${LINK} } } }`,
);

/** The signed-in person's side of a lesson; null when Learn is not open to them. */
export const LearnLessonMineDocument = doc<{ learnLessonMine: LearnLessonMineRead | null }, { slug: string }>(
  `query LearnLessonMine($slug: String!) { learnLessonMine(slug: $slug) { ${MINE} } }`,
);

/** A lesson of the signed-in person's side of a course: its depth, for the squares. */
export type LearnCourseLessonMine = { slug: string; depth: LearnDepth; known: boolean; due: boolean };

/**
 * The signed-in person's side of a course, whole: their figures, each lesson's depth, their next lesson, their check
 * and their rating. A lesson's page reads its lessons' depths; a course's page all of it. Null when Learn is not open
 * to them.
 */
export const LearnCourseMineDocument = doc<{ learnCourseMine: LearnCourseMine | null }, { slug: string }>(
  `query LearnCourseMine($slug: String!) {
    learnCourseMine(slug: $slug) {
      slug learned practised mastered known due lessons { slug depth known due } next { ${LINK} }
      check { state left } finishedAt feedbackGood
    }
  }`,
);

/** What the API answers to a lesson's answer: its own verdict, the person's side as it is now, and what is next. */
export type LearnLessonAnswered = { right: boolean; mine: LearnLessonMineRead; next: LearnLessonLink | null };

/** A lesson's answer, graded again by the API, which records a right one. */
export const AnswerLearnLessonDocument = doc<
  { answerLearnLesson: LearnLessonAnswered | null },
  { slug: string; question: string; picked: unknown; tries: number; language: string | null }
>(
  `mutation AnswerLearnLesson($slug: String!, $question: String!, $picked: JSON!, $tries: Int!, $language: String) {
    answerLearnLesson(slug: $slug, question: $question, picked: $picked, tries: $tries, language: $language) {
      right mine { ${MINE} } next { ${LINK} }
    }
  }`,
);

/** "Good" or "Not good" on a lesson, with an optional comment. */
export const SendLearnFeedbackDocument = doc<
  { sendLearnFeedback: boolean | null },
  { good: boolean; lesson: string; comment: string | null }
>(
  'mutation SendLearnFeedback($good: Boolean!, $lesson: String, $comment: String) { sendLearnFeedback(good: $good, lesson: $lesson, comment: $comment) }',
);
