import { cacheLife, cacheTag } from 'next/cache';

import { type RepoPackages, RepoPackagesDocument, type RepoUsedBy, RepoUsedByDocument } from '@/graphql/repo-packages';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { getRepoCacheTag } from '@/utils/repo-paths';

/** The API's error code for package data it could not read just now (never an answer that there is none). */
export const PACKAGES_UNAVAILABLE_CODE = 'PACKAGES_UNAVAILABLE';

/** No package data now: the page says so and is kept for minutes. */
export const UNAVAILABLE = 'unavailable';
export type Unavailable = typeof UNAVAILABLE;

/** Whether a failed read is that error: the request helper throws the API's errors as their JSON. */
export const isPackagesUnavailable = (error: unknown) =>
  error instanceof Error && error.message.includes(`"code":"${PACKAGES_UNAVAILABLE_CODE}"`);

/**
 * `next build` renders one repository's tabs ahead of time; it asks the API nothing about packages, and that render is
 * kept for minutes like any other render without package data.
 */
const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

/** Runs a package read: its value kept for hours, "unavailable" for minutes; any other failure is thrown. */
async function readOrUnavailable<T>(read: () => Promise<T>): Promise<T | Unavailable> {
  if (isBuild()) {
    cacheLife('minutes');
    return UNAVAILABLE;
  }
  try {
    const value = await read();
    cacheLife('hours');
    return value;
  } catch (error) {
    if (!isPackagesUnavailable(error)) throw error;
    cacheLife('minutes');
    return UNAVAILABLE;
  }
}

// The cached reads take owner and name lowercased, so every spelling of a repository shares one entry.

const readPackages = async (owner: string, name: string) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));

  return readOrUnavailable(async () => {
    const { repo } = (await graphqlDirect(RepoPackagesDocument, { owner, name })) ?? {};
    const packages = repo?.packages ?? null;
    return packages && packages.total > 0 && packages.items.length > 0 ? packages : null;
  });
};

/**
 * The npm packages a repository publishes: `null` when it publishes none, "unavailable" when the API could not read
 * them just now.
 */
export const fetchRepoPackages = (owner: string, name: string): Promise<RepoPackages | null | Unavailable> =>
  readPackages(owner.toLowerCase(), name.toLowerCase());

export type UsedByQuery = {
  offset: number;
  limit: number;
  /** Only the repositories that use this package; `null` for any of them. */
  package: string | null;
  hideArchived: boolean;
};

const readUsedBy = async (
  owner: string,
  name: string,
  offset: number,
  limit: number,
  pkg: string | null,
  hide: boolean,
) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));

  return readOrUnavailable(async () => {
    const variables = { owner, name, offset, limit, package: pkg, hideArchived: hide };
    const { repo } = (await graphqlDirect(RepoUsedByDocument, variables)) ?? {};
    return repo?.usedBy ?? null;
  });
};

/**
 * One page of the repositories with 100+ stars that use a repository's packages, most-starred first: `null` when it
 * publishes none, "unavailable" when the API could not read them just now.
 */
export const fetchRepoUsedBy = (
  owner: string,
  name: string,
  query: UsedByQuery,
): Promise<RepoUsedBy | null | Unavailable> =>
  readUsedBy(owner.toLowerCase(), name.toLowerCase(), query.offset, query.limit, query.package, query.hideArchived);
