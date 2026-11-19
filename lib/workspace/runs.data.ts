import 'server-only';

import { viewerLogin } from './contribute.data';
import { type ContributeRunsFilter, type ContributeRunsPage, RUNS_PAGE_SIZE } from './runs';
import { ContributeRunsDocument } from './runs.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * A page of the user's runs under the filter: the history's `page` (20 a page), or the Agent tab's preview with
 * `size`. `undefined` signed out or when the API does not answer it.
 */
export async function loadRuns(
  filter: ContributeRunsFilter,
  { page = 1, size = RUNS_PAGE_SIZE }: { page?: number; size?: number } = {},
): Promise<ContributeRunsPage | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const { contributeRuns } = await graphqlDirect(
      ContributeRunsDocument,
      { filter, first: size, ...(page > 1 ? { offset: (page - 1) * size } : {}) },
      { source: 'ssr', githubLogin },
    );
    return contributeRuns ?? undefined;
  } catch {
    return undefined;
  }
}
