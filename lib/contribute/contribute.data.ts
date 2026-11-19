import 'server-only';

import { cache } from 'react';

import { ISSUES_PAGE_SIZE } from './live-issues';
import { IN_FLIGHT_READ, IN_FLIGHT_STATES, type OverviewNowRead } from './overview';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { loadAttemptsIn, settled, viewerLogin } from '@/lib/workspace/contribute.data';
import {
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

/** Overview's "Right now": the attempts in flight, and what the scheduler counts before it starts one. Read once per request. */
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
