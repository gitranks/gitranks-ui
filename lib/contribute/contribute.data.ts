import 'server-only';

import type { ContributeTabRead } from './contribute-tab';
import { ContributeTabStateDocument, ContributeTabTotalsDocument } from './contribute-tab.documents';
import { ISSUES_PAGE_SIZE } from './live-issues';
import { keyedPageOf } from './masked-feed';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { settled, viewerLogin } from '@/lib/workspace/contribute.data';
import { ContributeIssuesMaskedDocument } from '@/lib/workspace/contribute.documents';
import type { ContributeIssuePage, ContributeIssuesFilter } from '@/lib/workspace/contribute.types';

/**
 * The first page of issues for the signed-in user, each with its masked form and its repo's rules; `undefined` when the
 * API does not answer the feed.
 */
export async function loadIssues(filter: ContributeIssuesFilter): Promise<ContributeIssuePage | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  const variables = {
    first: ISSUES_PAGE_SIZE,
    ...(Object.keys(filter).length ? { filter } : {}),
  };
  const options = { source: 'ssr' as const, githubLogin };
  try {
    const { contributeIssues } = await graphqlDirect(ContributeIssuesMaskedDocument, variables, options);
    return keyedPageOf(contributeIssues);
  } catch {
    return undefined;
  }
}

/**
 * What the Contribute tab reads beside the user's view: its side's totals and the hosted agent's level. Each read on
 * its own: one the API does not answer leaves its part out ("–", the level not known).
 */
export async function loadContributeTab(): Promise<ContributeTabRead> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { totals: null, hostedLevel: null };
  const options = { source: 'ssr' as const, githubLogin };
  const [totals, state] = await Promise.allSettled([
    graphqlDirect(ContributeTabTotalsDocument, undefined, options),
    graphqlDirect(ContributeTabStateDocument, undefined, options),
  ]);
  const contributor = settled(state)?.contribute?.contributor;
  return {
    totals: settled(totals)?.contributeContributions?.totals.byMode?.fix ?? null,
    hostedLevel: contributor?.settings?.hostedLevel ?? null,
  };
}
