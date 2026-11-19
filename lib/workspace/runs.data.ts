import 'server-only';

import { viewerLogin } from './contribute.data';
import { type ContributeRunsFilter, type ContributeRunsPage, RUNS_PAGE_SIZE } from './runs';
import { ContributeRunsDocument } from './runs.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The Runs page's first page under the filter: `undefined` signed out or when the API does not answer it. */
export async function loadRuns(filter: ContributeRunsFilter): Promise<ContributeRunsPage | undefined> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return undefined;
  try {
    const { contributeRuns } = await graphqlDirect(
      ContributeRunsDocument,
      { filter, first: RUNS_PAGE_SIZE },
      { source: 'ssr', githubLogin },
    );
    return contributeRuns ?? undefined;
  } catch {
    return undefined;
  }
}
