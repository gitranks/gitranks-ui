import type { Route } from 'next';

import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { isRepoSlug, RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/** The owner and name of a repository page's params, or `null` when they cannot name a repository. */
export function parseRepoParams(ownerParam: string, nameParam: string) {
  const owner = decode(ownerParam);
  const name = decode(nameParam);

  return owner !== null && name !== null && isRepoSlug(owner, name) ? { owner, name } : null;
}

/** The repository page of `owner/name`. */
export function getRepoPath(nameWithOwner: string) {
  const [owner, name] = nameWithOwner.split('/');
  return `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` as Route;
}

/** The owner's page here: an organization's or a user's; unknown when the API does not say which it is. */
export function getRepoOwnerPath(owner: string, isInOrganization?: boolean | null): Route | undefined {
  if (isInOrganization === true) {
    return `/org/${encodeURIComponent(owner)}` as Route;
  }
  if (isInOrganization === false) {
    return `/profile/${encodeURIComponent(owner)}` as Route;
  }
}

export function getRepoRankingPath(page: number | string = 1) {
  return `/repos/${page}` as Route;
}

/** A language's repository ranking; no language is the ranking of repositories without one. */
export function getRepoLanguageRankingPath(language: string | null | undefined, page: number | string = 1) {
  return (language ? `/repos/language/${encodeURIComponent(language)}/${page}` : `/repos/no-language/${page}`) as Route;
}

/** Whether a rank sits on a repository ranking page (the rankings list `RANKING_MAX_PAGE.repo` pages). */
export const isRankListed = (rank: number) => Math.ceil(rank / ITEMS_PER_PAGE) <= RANKING_MAX_PAGE.repo;

/**
 * The repository ranking page a rank is listed on; the first page when the rank is past the pages the rankings list
 * (`RANKING_MAX_PAGE.repo`), which answer 404.
 */
export function getRankingPageOf(rank: number) {
  const page = Math.ceil(rank / ITEMS_PER_PAGE);
  return page <= RANKING_MAX_PAGE.repo ? page : 1;
}

/** One cache tag per repository, whatever the spelling in the URL. */
export function getRepoCacheTag(owner: string, name: string) {
  return `repo:${owner}/${name}`.toLowerCase();
}
