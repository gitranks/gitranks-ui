import 'server-only';

import { cache } from 'react';

import { LearnAttemptLessonDocument, LearnSideDocument } from './learn.documents';
import type { LearnAttemptLesson } from './learn.types';
import type { LearnSetupRead } from './setup';
import { loadLearnSetup as loadSetupOf } from './setup.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeUnavailableError, viewerLogin } from '@/lib/workspace/contribute.data';
import { contributeErrorOf } from '@/lib/workspace/errors';

/**
 * The viewer's own setup of Learn (`/learn/setup`), for the page of one issue to tell whether they use Learn: null
 * signed out, when Learn is not open to them, and on any failure. Read once per request.
 */
export const loadLearnSetupOfMine = cache(async (): Promise<LearnSetupRead | null> => {
  const githubLogin = await viewerLogin();
  return githubLogin ? loadSetupOf(githubLogin) : null;
});

/**
 * Whether the API counts the viewer as using Learn (a Learn attempt of theirs, say), for someone who has used Learn
 * without saving a setup: false signed out and on any failure. Read once per request.
 */
export const loadUsesLearnSide = cache(async (): Promise<boolean> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return false;
  try {
    const { skillsMine } = await graphqlDirect(LearnSideDocument, {}, { source: 'ssr', githubLogin });
    return skillsMine?.usesLearn === true;
  } catch {
    return false;
  }
});

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
