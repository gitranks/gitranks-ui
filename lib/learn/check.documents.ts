import { parse } from 'graphql';

import type { LearnCheck, LearnKnownSaved } from './check';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The check's read and its writes: the run, an answer, "Stop and see the result", and saving the marks. Every one is
 * the signed-in person's own.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
const QUESTION = 'id type prompt example visual content codes { language code }';
const CHECK = `id course { ${LINK} } questions { group { ${LINK} } question { ${QUESTION} } answered }
  result { group { ${LINK} } outcome lessons { slug title proposed learned } }`;

/** The person's run of a course's check: questions without keys, or the result once it ended. */
export const LearnCheckDocument = doc<{ learnCheck: LearnCheck | null }, { course: string }>(
  `query LearnCheck($course: String!) { learnCheck(course: $course) { ${CHECK} } }`,
);

/** One answer, or "I don't know". No verdict comes back. */
export const AnswerLearnCheckDocument = doc<
  { answerLearnCheck: boolean | null },
  { course: string; group: string; picked?: unknown; dontKnow?: boolean; language?: string | null }
>(
  `mutation AnswerLearnCheck($course: String!, $group: String!, $picked: JSON, $dontKnow: Boolean, $language: String) {
    answerLearnCheck(course: $course, group: $group, picked: $picked, dontKnow: $dontKnow, language: $language)
  }`,
);

/** "Stop and see the result": ends the run and answers it with its result. */
export const StopLearnCheckDocument = doc<{ stopLearnCheck: LearnCheck | null }, { course: string }>(
  `mutation StopLearnCheck($course: String!) { stopLearnCheck(course: $course) { ${CHECK} } }`,
);

/** Saves which lessons of a course are marked as known; `check`, the run whose result it saves. */
export const SaveLearnKnownDocument = doc<
  { saveLearnKnown: LearnKnownSaved | null },
  { course: string; known: string[]; check?: string | null }
>(
  `mutation SaveLearnKnown($course: String!, $known: [String!]!, $check: String) {
    saveLearnKnown(course: $course, known: $known, check: $check) { start { ${LINK} } known }
  }`,
);
