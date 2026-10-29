import 'server-only';

import { MaintainerReposDocument } from './contribute.documents';
import type { ContributeMaintainerRepos } from './contribute.types';
import { type MaintainerErrorCode, maintainerErrorOf } from './errors';
import { currentMaintainerToken } from './maintainer-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** What the maintainers page shows below its explanation. */
export type MaintainerReposView =
  | { state: 'signed-out' }
  | { state: 'listed'; data: ContributeMaintainerRepos }
  | { state: 'failed'; error: MaintainerErrorCode };

/**
 * The visitor's repositories, read with the GitHub token of the page's sign-in: passed to the API as a variable,
 * never returned, logged or put in an error. Asks nothing without that sign-in.
 */
export async function loadMaintainerRepos(): Promise<MaintainerReposView> {
  const token = await currentMaintainerToken();
  if (!token) return { state: 'signed-out' };

  try {
    const { maintainerRepos } = await graphqlDirect(MaintainerReposDocument, { token }, { source: 'ssr' });
    return { state: 'listed', data: maintainerRepos };
  } catch (failure) {
    return { state: 'failed', error: maintainerErrorOf(failure) };
  }
}
