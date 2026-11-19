import 'server-only';

import { cache } from 'react';

import {
  LearnAttemptLessonDocument,
  LearnIssuesDocument,
  LearnProfileDocument,
  LearnSetupDocument,
  MyLearnAttemptsDocument,
  MyLessonsDocument,
  PracticeLessonsDocument,
} from './learn.documents';
import type {
  LearnAttemptLesson,
  LearnIssues,
  LearnProfile,
  MyLearnAttempts,
  MyLesson,
  PracticeLessons,
} from './learn.types';
import { learnOpenFor } from './learn-gate';
import { ContributeUnavailableError, ownAgentOf, viewerLogin } from '@/lib/contribute/contribute.data';
import { ContributeMcpConnectionsDocument, ContributeOwnAgentDocument } from '@/lib/contribute/contribute.documents';
import type { ContributeOwnAgent } from '@/lib/contribute/contribute.types';
import { contributeErrorOf } from '@/lib/contribute/errors';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Whether Learn is open to the signed-in viewer; closed signed out. Read once per request. */
export const loadLearnOpen = cache(async (): Promise<boolean> => learnOpenFor(await viewerLogin()));

/**
 * Whether the viewer's GitRanks account is still being set up: a new account Learn is open to, which GitRanks has not
 * read yet. False signed out and on any failure. Read once per request.
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

/**
 * The viewer's lessons: their Learn attempts and the shared lessons they passed, as the API orders them. Empty signed
 * out or when Learn is not open to them; undefined when the API does not answer, which the page says. Read once per
 * request.
 */
export const loadMyLessons = cache(async (): Promise<MyLesson[] | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return [];
  try {
    const { myLessons } = await graphqlDirect(MyLessonsDocument, undefined, { source: 'ssr', githubLogin });
    return myLessons ?? [];
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT') return [];
    return undefined;
  }
});

/**
 * The viewer's own agent, as Contribute reads it (its connections and their last calls), for Goal and level's card:
 * read alone, not with the rest of Contribute. Undefined signed out or when the API does not answer it.
 */
export const loadOwnAgent = cache(async (): Promise<ContributeOwnAgent | undefined> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  const options = { source: 'ssr' as const, githubLogin };
  const [agent, connections] = await Promise.allSettled([
    graphqlDirect(ContributeOwnAgentDocument, undefined, options),
    graphqlDirect(ContributeMcpConnectionsDocument, undefined, options),
  ]);
  if (agent.status === 'rejected') return undefined;
  return ownAgentOf(
    agent.value.contribute,
    connections.status === 'fulfilled' ? connections.value.contribute?.mcpTokens : null,
  );
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
      const { learnIssues } = await graphqlDirect(LearnIssuesDocument, { first }, { source: 'ssr', githubLogin });
      return learnIssues;
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
