import 'server-only';

import type { ContributeTabRead } from './contribute-tab';
import { ContributeTabStateDocument, ContributeTabTotalsDocument } from './contribute-tab.documents';
import { ISSUES_PAGE_SIZE } from './live-issues';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { settled, viewerLogin } from '@/lib/workspace/contribute.data';
import { ContributeIssuesDocument, ContributeIssuesWithRulesDocument } from '@/lib/workspace/contribute.documents';
import type { ContributeIssuePage, ContributeIssuesFilter } from '@/lib/workspace/contribute.types';
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
 * What the Contribute tab reads beside the user's view: its side's totals, who paused, the hosted agent's level. Each
 * read on its own: one the API does not answer leaves its part out ("–", no Resume, the level not known).
 */
export async function loadContributeTab(): Promise<ContributeTabRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { totals: null, pausedByYou: false, hostedLevel: null };
  const options = { source: 'ssr' as const, githubLogin };
  const [totals, state] = await Promise.allSettled([
    graphqlDirect(ContributeTabTotalsDocument, undefined, options),
    graphqlDirect(ContributeTabStateDocument, undefined, options),
  ]);
  const contributor = settled(state)?.contribute?.contributor;
  return {
    totals: settled(totals)?.contributeContributions?.totals.byMode?.fix ?? null,
    pausedByYou: contributor?.pausedByYou === true,
    hostedLevel: contributor?.settings?.hostedLevel ?? null,
  };
}
