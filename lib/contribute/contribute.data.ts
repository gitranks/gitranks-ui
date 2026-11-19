import 'server-only';

import { cache } from 'react';

import { ISSUES_PAGE_SIZE } from './live-issues';
import {
  IN_FLIGHT_READ,
  IN_FLIGHT_STATES,
  NEEDS_YOU_READ,
  NEEDS_YOU_STATES,
  type OverviewNeedsRead,
  type OverviewNowRead,
} from './overview';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  byAttemptId,
  loadAttemptsIn,
  loadContributions,
  loadRepliesWaiting,
  settled,
  viewerLogin,
  withFields,
} from '@/lib/workspace/contribute.data';
import {
  ContributeAttemptsInReviewAtDocument,
  ContributeImpactDocument,
  ContributeImpactReposDocument,
  ContributeIssuesDocument,
  ContributeIssuesWithRulesDocument,
  ContributeScheduleCountsDocument,
} from '@/lib/workspace/contribute.documents';
import type {
  ContributeImpactTotals,
  ContributeIssuePage,
  ContributeIssuesFilter,
} from '@/lib/workspace/contribute.types';
import { contributeErrorOf } from '@/lib/workspace/errors';

/** One page of issues for the signed-in user; `undefined` when the API does not answer the feed (yet). */
export async function loadIssues(
  filter: ContributeIssuesFilter,
  after?: string,
): Promise<ContributeIssuePage | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const variables = {
    first: ISSUES_PAGE_SIZE,
    ...(after ? { after } : {}),
    ...(Object.keys(filter).length ? { filter } : {}),
  };
  const options = { source: 'ssr' as const, githubLogin };
  try {
    return (await graphqlDirect(ContributeIssuesWithRulesDocument, variables, options)).contributeIssues;
  } catch (error) {
    // An API without the repos' rules: the feed as it was.
    if (contributeErrorOf(error).error !== 'NOT_AVAILABLE_YET') return undefined;
  }
  try {
    return (await graphqlDirect(ContributeIssuesDocument, variables, options)).contributeIssues;
  } catch {
    return undefined;
  }
}

/**
 * Overview's "Needs you": the attempts waiting for the user, the replies they can approve, the open pull requests,
 * and the runs in flight ("Right now"'s read, once per request).
 */
export async function loadOverviewNeeds(): Promise<OverviewNeedsRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { reviews: undefined, replies: undefined, contributions: undefined, runs: undefined };

  const options = { source: 'ssr' as const, githubLogin };
  const variables = { states: NEEDS_YOU_STATES, first: NEEDS_YOU_READ };
  const [attempts, reviewAt, replies, contributions, now] = await Promise.allSettled([
    loadAttemptsIn(NEEDS_YOU_STATES, NEEDS_YOU_READ),
    graphqlDirect(ContributeAttemptsInReviewAtDocument, variables, options),
    loadRepliesWaiting(),
    loadContributions(),
    loadOverviewNow(),
  ]);
  const reviews = settled(attempts);
  const readyAt = byAttemptId(settled(reviewAt)?.contributeAttempts);
  return {
    reviews: reviews?.map((attempt) => withFields(attempt, readyAt.get(attempt.attemptId))),
    replies: settled(replies),
    contributions: settled(contributions)?.items,
    runs: settled(now)?.inFlight,
  };
}

/**
 * Overview's "Right now": the attempts in flight, and what the scheduler counts before it starts one. Read once per
 * request: Needs you shows the runs under way from it too.
 */
export const loadOverviewNow = cache(async (): Promise<OverviewNowRead> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { inFlight: undefined, scheduleCounts: undefined };

  const [inFlight, counts] = await Promise.allSettled([
    loadAttemptsIn(IN_FLIGHT_STATES, IN_FLIGHT_READ),
    graphqlDirect(ContributeScheduleCountsDocument, undefined, { source: 'ssr', githubLogin }),
  ]);
  const scheduleCounts = settled(counts)?.contribute?.contributor?.scheduleCounts;
  return {
    inFlight: settled(inFlight),
    scheduleCounts:
      typeof scheduleCounts?.prBound === 'number' && typeof scheduleCounts.queued === 'number'
        ? scheduleCounts
        : undefined,
  };
});

/** Overview's "Your impact": the totals, with `reposHelped` when the API answers it; `undefined` when it does not. */
export async function loadOverviewImpact(): Promise<ContributeImpactTotals | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const options = { source: 'ssr' as const, githubLogin };
  const [totals, repos] = await Promise.allSettled([
    graphqlDirect(ContributeImpactDocument, undefined, options),
    graphqlDirect(ContributeImpactReposDocument, undefined, options),
  ]);
  const main = settled(totals)?.contributeContributions?.totals;
  if (!main) return undefined;
  const reposHelped = settled(repos)?.contributeContributions?.totals.reposHelped;
  return { ...main, ...(typeof reposHelped === 'number' ? { reposHelped } : {}) };
}
