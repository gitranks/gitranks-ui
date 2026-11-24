import type { Route } from 'next';

import { getRepoPath } from '@/utils/repo-paths';

/** A repository's tabs: Overview is its own page, the others are under it. */
export type RepoTab = 'overview' | 'used-by' | 'contributors';

/** Where the proxy sends `/repo/<owner>/<name>`. Never a URL of its own. */
export const OVERVIEW_SEGMENT = 'overview';

/** A tab's address: `/repo/<owner>/<name>` for Overview, `/repo/<owner>/<name>/<tab>` for the others. */
export function repoTabPath(nameWithOwner: string, tab: RepoTab): Route {
  // A plain string first: a template built on `Route` expands every typed route, and TypeScript gives up once the app
  // has enough of them (TS2590).
  const path: string = getRepoPath(nameWithOwner);
  return (tab === 'overview' ? path : `${path}/${tab}`) as Route;
}
