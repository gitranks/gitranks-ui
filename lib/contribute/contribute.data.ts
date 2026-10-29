import 'server-only';

import {
  ContributeAttemptDocument,
  ContributeAttemptsDocument,
  ContributeContributionsDocument,
  ContributeGrantDocument,
  ContributeIssuesDocument,
  ContributeOverviewDocument,
  ContributePausedDocument,
} from './contribute.documents';
import type {
  ContributeAttempt,
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeContributions,
  ContributeIssuePage,
  ContributeIssuesFilter,
  ContributeView,
} from './contribute.types';
import { contributeErrorOf } from './errors';
import { isGrantAvailable } from './grant-availability';
import { auth } from '@/auth';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The signed-in user's GitHub login, for calls made on their behalf; null without a usable session. */
export async function viewerLogin(): Promise<string | null> {
  const session = await auth();
  return session?.user?.githubLogin && !session.error ? session.user.githubLogin : null;
}

const settled = <T>(result: PromiseSettledResult<T>): T | undefined =>
  result.status === 'fulfilled' ? result.value : undefined;

/** The API did not answer the overview: the pages show "try again" (`app/contribute/error.tsx`), never a 404. */
export class ContributeUnavailableError extends Error {
  constructor() {
    super('GitRanks Contribute did not load');
    this.name = 'ContributeUnavailableError';
  }
}

/**
 * Everything the Contribute pages show for the signed-in user; null when Contribute is hidden from them (signed out,
 * or not on the preview), which the pages answer with a 404. A failed read throws `ContributeUnavailableError`. The
 * grant and the pause are read on their own, so an API that does not answer them yet leaves them `undefined` and the
 * rest of the page working.
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

  if (overview.status === 'rejected') throw new ContributeUnavailableError();
  const { contribute } = overview.value;
  if (!contribute?.previewAllowed) return null;

  const pausedField = settled(paused)?.contribute?.contributor?.paused;
  return {
    contributor: contribute.contributor,
    grant: settled(grant)?.contribute?.grant ?? undefined,
    paused: typeof pausedField === 'boolean' ? pausedField : undefined,
    grantAvailable: isGrantAvailable(),
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

/** The signed-in user's attempts, newest first, optionally in one state; `undefined` when the API does not answer. */
export async function loadAttempts(
  state?: ContributeAttemptState,
  first = 20,
): Promise<ContributeAttempt[] | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  try {
    const { contributeAttempts } = await graphqlDirect(
      ContributeAttemptsDocument,
      { first, ...(state ? { state } : {}) },
      { source: 'ssr', githubLogin },
    );
    return contributeAttempts ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * One of the signed-in user's attempts, for the review: null when there is none for them (not theirs, signed out or
 * hidden), which the page answers with a 404; `undefined` when the API does not answer the review yet. An outage throws
 * `ContributeUnavailableError`.
 */
export async function loadAttempt(id: string): Promise<ContributeAttemptDetail | null | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;

  try {
    const { contributeAttempt } = await graphqlDirect(
      ContributeAttemptDocument,
      { id },
      { source: 'ssr', githubLogin },
    );
    return contributeAttempt;
  } catch (failure) {
    const { error } = contributeErrorOf(failure);
    if (error === 'NOT_FOUND' || error === 'SIGNED_OUT' || error === 'INVALID') return null;
    if (error === 'NOT_AVAILABLE_YET') return undefined;
    throw new ContributeUnavailableError();
  }
}

/** My contributions: the user's pull requests and their totals; `undefined` when the API does not answer them. */
export async function loadContributions(first = 50): Promise<ContributeContributions | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;

  try {
    const { contributeContributions } = await graphqlDirect(
      ContributeContributionsDocument,
      { first },
      { source: 'ssr', githubLogin },
    );
    return contributeContributions ?? undefined;
  } catch {
    return undefined;
  }
}
