import 'server-only';

import { cache } from 'react';

import { LearnAttemptLessonDocument, LearnProfileDocument, MyLessonsDocument } from './learn.documents';
import type { LearnAttemptLesson, LearnProfile, MyLesson } from './learn.types';
import { learnOpenFor } from './learn-gate';
import { ContributeUnavailableError, ownAgentOf, viewerLogin } from '@/lib/contribute/contribute.data';
import { ContributeMcpConnectionsDocument, ContributeOwnAgentDocument } from '@/lib/contribute/contribute.documents';
import type { ContributeOwnAgent } from '@/lib/contribute/contribute.types';
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
