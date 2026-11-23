'use server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { lessonAnswerInputOf, lessonFeedbackInputOf } from '@/lib/learn/lesson-answer-input';
import {
  AnswerLearnLessonDocument,
  type LearnLessonAnswered,
  SendLearnFeedbackDocument,
} from '@/lib/learn/lesson-page.documents';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';

/*
 * A lesson's page writes two things, always as the session's user and never one named in the arguments: a right
 * answer, which the API grades again and records, and a rating with its optional comment.
 */

const invalid = <T>(): ContributeActionResult<T> => ({
  ok: false,
  error: 'INVALID',
  message: 'That was not accepted.',
});

/**
 * A right answer to a lesson's question: the API's own verdict, the person's side as it is now, and what is next.
 * Null data when Learn is not open to the person.
 */
export async function answerLearnLessonAction(input: {
  slug: string;
  question: string;
  picked: unknown;
  tries: number;
  language: string | null;
}): Promise<ContributeActionResult<LearnLessonAnswered | null>> {
  const answer = lessonAnswerInputOf(input ?? {});
  if (!answer) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(AnswerLearnLessonDocument, answer, { source: 'client', githubLogin });
    return { ok: true, data: data.answerLearnLesson ?? null };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}

/** "Good" or "Not good" on a lesson, with an optional comment: whether the API saved it. */
export async function sendLearnFeedbackAction(input: {
  lesson: string;
  good: boolean;
  comment?: string | null;
}): Promise<ContributeActionResult<boolean>> {
  const feedback = lessonFeedbackInputOf(input ?? {});
  if (!feedback) return invalid();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(SendLearnFeedbackDocument, feedback, { source: 'client', githubLogin });
    return { ok: true, data: data.sendLearnFeedback === true };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}
