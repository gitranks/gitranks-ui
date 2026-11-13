import 'server-only';

import { cache } from 'react';

import { LearnAttemptLessonDocument } from './learn.documents';
import type { LearnAttemptLesson } from './learn.types';
import { learnOpenFor } from './learn-gate';
import { ContributeUnavailableError, viewerLogin } from '@/lib/contribute/contribute.data';
import { contributeErrorOf } from '@/lib/contribute/errors';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Whether Learn is open to the signed-in viewer; closed signed out. Read once per request. */
export const loadLearnOpen = cache(async (): Promise<boolean> => learnOpenFor(await viewerLogin()));

/**
 * The viewer's lesson in one of their Learn attempts: null when there is none for them (not theirs, not a Learn
 * attempt, signed out, or Learn not open to them), which the page answers with a 404. An outage throws
 * `ContributeUnavailableError`. Read once per request.
 */
export const loadAttemptLesson = cache(async (attemptId: string): Promise<LearnAttemptLesson | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { learnAttemptLesson } = await graphqlDirect(
      LearnAttemptLessonDocument,
      { attemptId },
      { source: 'ssr', githubLogin },
    );
    return learnAttemptLesson;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID' || error === 'NOT_AVAILABLE_YET') {
      return null;
    }
    throw new ContributeUnavailableError();
  }
});
