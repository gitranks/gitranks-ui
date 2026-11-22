import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { type RepoTab, repoTabPath } from '../utils/repo-tabs';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { getRepoCacheTag, parseRepoParams } from '@/utils/repo-paths';

/**
 * The repository a tab is drawn for: an impossible or missing repository is not found; one found by an earlier name,
 * or spelled in another letter case, redirects to the same tab at its stored name.
 * Tags the page with the repository and sets its cache life. For a page's own render: its `notFound()` and
 * `permanentRedirect()` answer real statuses (the tabs have no loading state above them).
 */
export async function repoForTab(ownerParam: string, nameParam: string, tab: RepoTab) {
  const repoParams = parseRepoParams(ownerParam, nameParam);
  if (!repoParams) {
    notFound();
  }

  const { owner, name } = repoParams;
  cacheTag(getRepoCacheTag(owner, name));
  const repo = await fetchRepo(owner, name);
  // A running fetch ends on its own: such a page is kept only briefly. A page that reads more may shorten it again.
  if (repo?.pull?.status === 'running') {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  if (!repo) {
    notFound();
  }
  // Found by an earlier name: the repository was renamed or transferred.
  if (repo.renamedTo) {
    permanentRedirect(repoTabPath(repo.renamedTo, tab));
  }
  // One URL per repository: a case variant redirects to the stored spelling.
  if (repo.nameWithOwner !== `${owner}/${name}`) {
    permanentRedirect(repoTabPath(repo.nameWithOwner, tab));
  }

  return repo;
}

/** For metadata: the repository when the tab is drawn for it, else `null` (the page then answers 404 or redirects). */
export async function repoForTabMetadata(ownerParam: string, nameParam: string) {
  const repoParams = parseRepoParams(ownerParam, nameParam);
  if (!repoParams) {
    notFound();
  }
  const repo = await fetchRepo(repoParams.owner, repoParams.name);
  const canonical = !!repo && !repo.renamedTo && repo.nameWithOwner === `${repoParams.owner}/${repoParams.name}`;
  return canonical ? repo : null;
}
