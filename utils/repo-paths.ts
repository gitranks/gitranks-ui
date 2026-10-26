import type { Route } from 'next';

import { ITEMS_PER_PAGE } from '@/app/app.consts';

/** The repository page of `owner/name`. */
export function getRepoPath(nameWithOwner: string) {
  const [owner, name] = nameWithOwner.split('/');
  return `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` as Route;
}

export function getRepoRankingPath(page: number | string = 1) {
  return `/repos/${page}` as Route;
}

/** A language's repository ranking; no language is the ranking of repositories without one. */
export function getRepoLanguageRankingPath(language: string | null | undefined, page: number | string = 1) {
  return (language ? `/repos/language/${encodeURIComponent(language)}/${page}` : `/repos/no-language/${page}`) as Route;
}

/** The ranking page a rank is listed on. */
export function getRankingPageOf(rank: number) {
  return Math.ceil(rank / ITEMS_PER_PAGE);
}

/** One cache tag per repository, whatever the spelling in the URL. */
export function getRepoCacheTag(owner: string, name: string) {
  return `repo:${owner}/${name}`.toLowerCase();
}
