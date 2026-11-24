import 'server-only';

import { cache } from 'react';

import {
  LearnAttemptLessonDocument,
  LearnIssuesMaskedDocument,
  LearnProfileDocument,
  LearnSetupDocument,
  MyLearnAttemptsDocument,
  PracticeLessonsDocument,
} from './learn.documents';
import type { LearnAttemptLesson, LearnIssues, LearnProfile, MyLearnAttempts, PracticeLessons } from './learn.types';
import { learnIssuesOf } from './masked-rows';
import type { LearnSetupRead } from './setup';
import { loadLearnSetup as loadSetupOf } from './setup.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeUnavailableError, viewerLogin } from '@/lib/workspace/contribute.data';
import { contributeErrorOf } from '@/lib/workspace/errors';

/**
 * Whether the viewer's GitRanks account is still being set up: a new account GitRanks has not read yet. False signed out and on any failure. Read once per request.
 */
export const loadLearnSetup = cache(async (): Promise<boolean> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return false;
  try {
    const { learnSetup } = await graphqlDirect(LearnSetupDocument, undefined, { source: 'ssr', githubLogin });
    return learnSetup === true;
  } catch {
    return false;
  }
});

/**
 * The viewer's own setup of Learn (`/learn/setup`), for the page of one issue to tell whether they use Learn: null
 * signed out, when Learn is not open to them, and on any failure. Read once per request.
 */
export const loadLearnSetupOfMine = cache(async (): Promise<LearnSetupRead | null> => {
  const githubLogin = await viewerLogin();
  return githubLogin ? loadSetupOf(githubLogin) : null;
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

/**
 * The viewer's goal, levels and focus: null when the API has none for them (signed out, or Learn not open to them). An
 * outage throws `ContributeUnavailableError`. Read once per request.
 */
export const loadLearnProfile = cache(async (): Promise<LearnProfile | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { learnProfile } = await graphqlDirect(LearnProfileDocument, undefined, { source: 'ssr', githubLogin });
    return learnProfile;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'NOT_AVAILABLE_YET') return null;
    throw new ContributeUnavailableError();
  }
});

/** A Learn read for the viewer that answers nothing when it fails: the page leaves its part out or says so. */
async function viewerRead<T>(read: (githubLogin: string) => Promise<T>): Promise<T | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    return await read(githubLogin);
  } catch {
    return undefined;
  }
}

/**
 * The issues for the viewer's goal, `first` of them (0 answers the total alone and reveals nothing): undefined signed
 * out, or when the API does not answer them. Read once per request and `first`.
 */
export const loadLearnIssues = cache(
  async (first: number): Promise<LearnIssues | undefined> =>
    viewerRead(async (githubLogin) => {
      const options = { source: 'ssr' as const, githubLogin };
      // A masked row leaves the read stripped of what names its issue, keyed by its mask id.
      return learnIssuesOf((await graphqlDirect(LearnIssuesMaskedDocument, { first }, options)).learnIssues);
    }),
);

/**
 * Other learners' lessons for the viewer's goal, `first` of them: undefined signed out, or when the API does not
 * answer them. Read once per request and `first`.
 */
export const loadPracticeLessons = cache(
  async (first: number): Promise<PracticeLessons | undefined> =>
    viewerRead(async (githubLogin) => {
      const { practiceLessons } = await graphqlDirect(
        PracticeLessonsDocument,
        { first },
        { source: 'ssr', githubLogin },
      );
      return practiceLessons;
    }),
);

/**
 * The viewer's Learn attempt in progress and their newest pull request: undefined signed out, or when the API does not
 * answer it. Read once per request.
 */
export const loadMyLearnAttempts = cache(
  async (): Promise<MyLearnAttempts | undefined> =>
    viewerRead(async (githubLogin) => {
      const { myLearnAttempts } = await graphqlDirect(MyLearnAttemptsDocument, undefined, {
        source: 'ssr',
        githubLogin,
      });
      return myLearnAttempts;
    }),
);
