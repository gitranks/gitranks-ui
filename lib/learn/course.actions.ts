'use server';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { SendLearnCourseFeedbackDocument } from '@/lib/learn/course.documents';
import { isContentSlug } from '@/lib/learn/paths';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';

/*
 * A course's page writes one thing, always as the session's user and never one named in the arguments: the rating of
 * a course the person finished.
 */

/** "Good" or "Not good" on a course: whether the API saved it. */
export async function sendLearnCourseFeedbackAction(input: {
  course: string;
  good: boolean;
}): Promise<ContributeActionResult<boolean>> {
  const { course, good } = input ?? {};
  if (typeof course !== 'string' || !isContentSlug(course) || typeof good !== 'boolean') {
    return { ok: false, error: 'INVALID', message: 'That was not accepted.' };
  }
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(
      SendLearnCourseFeedbackDocument,
      { course, good },
      { source: 'client', githubLogin },
    );
    return { ok: true, data: data.sendLearnFeedback === true };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}
