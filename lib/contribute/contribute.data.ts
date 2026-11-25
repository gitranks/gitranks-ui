import 'server-only';

import { type ContributeHomeTotals, ContributeTabTotalsDocument } from './contribute-tab.documents';
import { ISSUES_PAGE_SIZE } from './live-issues';
import { keyedPageOf } from './masked-feed';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';
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
 * The totals Contribute home's "Merged" box reads: every pull request sent through GitRanks, merged and the projects
 * helped. Null when the API does not answer them, or answers them without a number: the box then says it could not read.
 */
export async function loadContributeTab(): Promise<ContributeHomeTotals | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  try {
    const { contributeContributions } = await graphqlDirect(ContributeTabTotalsDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    const totals = contributeContributions?.totals;
    const { merged, reposHelped } = totals ?? {};
    return typeof merged === 'number' && typeof reposHelped === 'number' ? { merged, reposHelped } : null;
  } catch {
    return null;
  }
}
