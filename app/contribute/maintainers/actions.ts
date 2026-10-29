'use server';

import { signIn } from '@/auth';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { OptInReposDocument, OptOutReposDocument } from '@/lib/contribute/contribute.documents';
import type { ContributeOptOutResult } from '@/lib/contribute/contribute.types';
import { type MaintainerErrorCode, maintainerErrorOf } from '@/lib/contribute/errors';
import { currentMaintainerToken, markMaintainerSignIn } from '@/lib/contribute/maintainer-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The API changes at most this many repositories a call; a larger choice goes in turns. */
const IDS_PER_CALL = 100;
/** No more than the page lists. */
const IDS_MAX = 300;
const NODE_ID = /^[A-Za-z0-9_=+/-]{1,100}$/;

/**
 * Each changed repository as the API answered it; on a failure, the turns that went through before it. The GitHub
 * token never comes back: it is read from the session here and sent to the API alone.
 */
export type MaintainerActionResult =
  | { ok: true; data: ContributeOptOutResult[] }
  | { ok: false; error: MaintainerErrorCode; data: ContributeOptOutResult[] };

/** Unique, well-formed node ids, as many as the page lists. */
const repoIdsOf = (repoIds: unknown): string[] =>
  [...new Set(Array.isArray(repoIds) ? repoIds : [])]
    .filter((id): id is string => typeof id === 'string' && NODE_ID.test(id))
    .slice(0, IDS_MAX);

type Variables = { token: string; repoIds: string[] };

async function change(
  ask: (variables: Variables) => Promise<ContributeOptOutResult[]>,
  repoIds: unknown,
): Promise<MaintainerActionResult> {
  const token = await currentMaintainerToken();
  if (!token) return { ok: false, error: 'SIGNED_OUT', data: [] };

  const ids = repoIdsOf(repoIds);
  const data: ContributeOptOutResult[] = [];
  for (let start = 0; start < ids.length; start += IDS_PER_CALL) {
    try {
      data.push(...(await ask({ token, repoIds: ids.slice(start, start + IDS_PER_CALL) })));
    } catch (failure) {
      return { ok: false, error: maintainerErrorOf(failure), data };
    }
  }
  return { ok: true, data };
}

/** Takes the chosen repositories out of Contribute, those the visitor's GitHub account administers or maintains. */
export async function optOutMaintainerRepos(repoIds: string[]): Promise<MaintainerActionResult> {
  return change(
    async (variables) => (await graphqlDirect(OptOutReposDocument, variables, { source: 'client' })).optOutRepos,
    repoIds,
  );
}

/** Lifts the opt-out of the chosen repositories. */
export async function optInMaintainerRepos(repoIds: string[]): Promise<MaintainerActionResult> {
  return change(
    async (variables) => (await graphqlDirect(OptInReposDocument, variables, { source: 'client' })).optInRepos,
    repoIds,
  );
}

/** The light GitHub sign-in, marked as the maintainers page's so its token is kept for the page, and back to it. */
export async function signInAsMaintainer(): Promise<void> {
  await signIn(IDENTITY_PROVIDER, { redirectTo: await markMaintainerSignIn() });
}
