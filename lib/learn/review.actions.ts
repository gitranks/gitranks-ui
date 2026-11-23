'use server';

import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
import { type LearnReviewAnswered, reviewAnswerInputOf } from './review';
import { AnswerLearnReviewDocument } from './review.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/**
 * One answer of the review, as the session's user and never one named in the arguments: a pick, or "I don't remember".
 * The API grades it, records it, and answers with the key and what changed. Null data when Learn is not open to the
 * person; `CONFLICT` when the item was answered already or is not due now.
 */
export async function answerLearnReviewAction(input: {
  item: string;
  picked: unknown;
  forgot: boolean;
  language: string | null;
}): Promise<LearnActionResult<LearnReviewAnswered | null>> {
  const answer = reviewAnswerInputOf(input ?? {});
  if (!answer) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  const variables = answer.forgot
    ? { item: answer.item, forgot: true, language: answer.language }
    : { item: answer.item, picked: answer.picked, language: answer.language };
  try {
    const data = await graphqlDirect(AnswerLearnReviewDocument, variables, { source: 'client', githubLogin });
    return { ok: true, data: data.answerLearnReview ?? null };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}
