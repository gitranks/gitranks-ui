import { cacheLife, cacheTag } from 'next/cache';

import { type RepoPackages, RepoPackagesDocument, type RepoUsedBy, RepoUsedByDocument } from '@/graphql/repo-packages';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { apiRegistryOf, isListedApiRegistry, type PackageRef, type RegistryId } from '@/lib/packages/registries';
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
    const packages = listedOnly(repo?.packages ?? null);
    return packages && packages.total > 0 && packages.items.length > 0 ? packages : null;
  });
};

/**
 * The packages on registries the site lists: a package on any other is left out, and out of the count, so nothing
 * links it to a page the site does not draw.
 */
function listedOnly(packages: RepoPackages | null): RepoPackages | null {
  if (!packages) return null;
  const items = packages.items.filter(({ registry }) => isListedApiRegistry(registry));
  const dropped = packages.items.length - items.length;
  return dropped ? { ...packages, items, total: packages.total - dropped } : packages;
}

/**
 * The packages a repository publishes: `null` when it publishes none, "unavailable" when the API could not read
 * them just now.
 */
export const fetchRepoPackages = (owner: string, name: string): Promise<RepoPackages | null | Unavailable> =>
  readPackages(owner.toLowerCase(), name.toLowerCase());

export type UsedByQuery = {
  offset: number;
  limit: number;
  /** Only the repositories that use this package, by its registry and name; `null` for any of them. */
  package: PackageRef | null;
  hideArchived: boolean;
};

const readUsedBy = async (
  owner: string,
  name: string,
  offset: number,
  limit: number,
  pkg: string | null,
  registry: RegistryId | null,
  hide: boolean,
) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));

  return readOrUnavailable(async () => {
    // The package's registry goes with its name: the API looks a name up on npm when it is told none.
    const variables = {
      owner,
      name,
      offset,
      limit,
      package: pkg,
      ...(registry ? { registry: apiRegistryOf(registry) } : {}),
      hideArchived: hide,
    };
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
  readUsedBy(
    owner.toLowerCase(),
    name.toLowerCase(),
    query.offset,
    query.limit,
    query.package?.name ?? null,
    query.package?.registry ?? null,
    query.hideArchived,
  );
