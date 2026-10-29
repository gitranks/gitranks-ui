import 'server-only';

import {
  ContributeGrantDocument,
  ContributeIssuesDocument,
  ContributeOverviewDocument,
  ContributePausedDocument,
} from './contribute.documents';
import type { ContributeIssuePage, ContributeIssuesFilter, ContributeView } from './contribute.types';
import { auth } from '@/auth';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The signed-in user's GitHub login, for calls made on their behalf; null without a usable session. */
export async function viewerLogin(): Promise<string | null> {
  const session = await auth();
  return session?.user?.githubLogin && !session.error ? session.user.githubLogin : null;
}

const settled = <T>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === 'fulfilled' ? result.value : undefined;

/**
 * Everything the Contribute pages show for the signed-in user; null when Contribute is hidden from them (signed out,
 * or not on the preview), which the pages answer with a 404. The grant and the pause are read on their own, so an API
 * that does not answer them yet leaves them `undefined` and the rest of the page working.
 */
export async function loadContribute(): Promise<ContributeView | null> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  const options = { source: 'ssr' as const, githubLogin };
  const [overview, grant, paused] = await Promise.allSettled([
    graphqlDirect(ContributeOverviewDocument, undefined, options),
    graphqlDirect(ContributeGrantDocument, undefined, options),
    graphqlDirect(ContributePausedDocument, undefined, options),
  ]);

  const contribute = settled(overview)?.contribute;
  if (!contribute?.previewAllowed) return null;

  const pausedField = settled(paused)?.contribute?.contributor?.paused;
  return {
    contributor: contribute.contributor,
    grant: settled(grant)?.contribute?.grant ?? undefined,
    paused: typeof pausedField === 'boolean' ? pausedField : undefined,
  };
}

/** One page of issues for the signed-in user; `undefined` when the API does not answer the feed (yet). */
export async function loadIssues(
  filter: ContributeIssuesFilter,
  after?: string,
): Promise<ContributeIssuePage | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  try {
    const { contributeIssues } = await graphqlDirect(
      ContributeIssuesDocument,
      { first: 20, ...(after ? { after } : {}), ...(Object.keys(filter).length ? { filter } : {}) },
      { source: 'ssr', githubLogin },
    );
    return contributeIssues;
  } catch {
    return undefined;
  }
}
