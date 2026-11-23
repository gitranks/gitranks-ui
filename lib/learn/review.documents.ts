import { parse } from 'graphql';

import type { LearnLessonLink } from './lesson-page';
import type { LearnReview, LearnReviewAnswered } from './review';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The review's reads and its write: today's set, where to go once it is done, and an answer. Every one is the
 * signed-in person's own.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
const QUESTION = 'id type prompt example visual content codes { language code }';

/** Today's set, for every course or one: questions without their key. Null when Learn is not open to the person. */
export const LearnReviewDocument = doc<{ learnReview: LearnReview | null }, { course?: string | null }>(
  `query LearnReview($course: String) {
    learnReview(course: $course) {
      items { id course { ${LINK} } question { ${QUESTION} } }
      more nextReviewAt nextReviewLessons
    }
  }`,
);

/** A pick, or "I don't remember", for one item: the verdict with the key, the lesson, and what changed. */
export const AnswerLearnReviewDocument = doc<
  { answerLearnReview: LearnReviewAnswered | null },
  { item: string; picked?: unknown; forgot?: boolean; language?: string | null }
>(
  `mutation AnswerLearnReview($item: String!, $picked: JSON, $forgot: Boolean, $language: String) {
    answerLearnReview(item: $item, picked: $picked, forgot: $forgot, language: $language) {
      right question { ${QUESTION} } lesson { ${LINK} } change
    }
  }`,
);

/** The main language of the person's setup, or of our guess of it: the review asks code in it first. */
export const LearnSetupMainLanguageDocument = doc<{ learnSetupOfMine: { mainLanguage: string | null } | null }>(
  'query LearnSetupMainLanguage { learnSetupOfMine { mainLanguage } }',
);

/** Where Learn home sends the person next: a lesson, or with none left a course to start. */
export const LearnHomeNextDocument = doc<{
  learnHome: { next: LearnLessonLink | null; nextCourse: LearnLessonLink | null } | null;
}>(`query LearnHomeNext { learnHome { next { ${LINK} } nextCourse { ${LINK} } } }`);

/** The next lesson of one course for the person. */
export const LearnCourseNextDocument = doc<
  { learnCourseMine: { slug: string; next: LearnLessonLink | null } | null },
  { slug: string }
>(`query LearnCourseNext($slug: String!) { learnCourseMine(slug: $slug) { slug next { ${LINK} } } }`);
