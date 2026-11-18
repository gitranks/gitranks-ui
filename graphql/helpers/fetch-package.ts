import { cacheLife, cacheTag } from 'next/cache';

import { DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import {
  type PackageDependents,
  PackageDependentsDocument,
  type PackagePage,
  PackagePageDocument,
} from '@/graphql/package-page';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { packageCacheTag } from '@/lib/packages/package-paths';

/** The API's error code for package data it could not read just now (never an answer that there is none). */
const PACKAGES_UNAVAILABLE_CODE = 'PACKAGES_UNAVAILABLE';

/** No package data now: the page says so and is kept for minutes. */
export const PACKAGE_UNAVAILABLE: Unavailable = 'unavailable';

/** Whether a failed read is that error: the request helper throws the API's errors as their JSON. */
const isPackagesUnavailable = (error: unknown) =>
  error instanceof Error && error.message.includes(`"code":"${PACKAGES_UNAVAILABLE_CODE}"`);

/**
 * `next build` renders one package's page ahead of time; it asks the API nothing about packages, and that render is
 * kept for minutes like any other render without package data.
 */
const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

/** Whether a package's page changes soon by itself: a refresh under way, or a name nobody has read yet. */
export const isPackageSettling = (pkg: Pick<PackagePage, 'state' | 'refreshRunning'>) =>
  pkg.state === 'NOT_READ' || pkg.refreshRunning === true;

// The cached reads take the name as the registry spells it (old npm names may hold capitals): one entry per name,
// tagged with the package's tag in lower case, so a refresh of it expires every entry.

const readPackage = async (name: string) => {
  'use cache';
  cacheTag(packageCacheTag(name));

  if (isBuild()) {
    cacheLife('minutes');
    return PACKAGE_UNAVAILABLE;
  }
  try {
    const { package: pkg } =
      (await graphqlDirect(PackagePageDocument, { registry: 'NPM', name, limit: DEPENDENTS_PAGE_SIZE })) ?? {};
    // A refresh under way, or a package not read yet, changes soon: kept for minutes.
    if (pkg && isPackageSettling(pkg)) {
      cacheLife('minutes');
    } else {
      cacheLife('hours');
    }
    return pkg ?? null;
  } catch (error) {
    if (!isPackagesUnavailable(error)) throw error;
    cacheLife('minutes');
    return PACKAGE_UNAVAILABLE;
  }
};

/**
 * An npm package's page data by its exact name: `null` when the registry does not have it, "unavailable" when the API
 * could not read package data just now. A valid name nobody has read yet is a package with `state: 'NOT_READ'`.
 */
export const fetchPackage = (name: string): Promise<PackagePage | null | Unavailable> => readPackage(name);

const readDependents = async (name: string, offset: number, hideArchived: boolean) => {
  'use cache';
  cacheTag(packageCacheTag(name));

  try {
    const variables = { registry: 'NPM' as const, name, offset, limit: DEPENDENTS_PAGE_SIZE, hideArchived };
    const { package: pkg } = (await graphqlDirect(PackageDependentsDocument, variables)) ?? {};
    cacheLife('hours');
    return pkg?.dependents ?? null;
  } catch (error) {
    if (!isPackagesUnavailable(error)) throw error;
    cacheLife('minutes');
    return PACKAGE_UNAVAILABLE;
  }
};

/**
 * One page of the repositories with 100+ stars that depend on an npm package, most-starred first: `null` for a name the
 * registry does not have or one not read yet, "unavailable" when the API could not read them just now.
 */
export const fetchPackageDependents = (
  name: string,
  query: { offset: number; hideArchived: boolean },
): Promise<PackageDependents | null | Unavailable> => readDependents(name, query.offset, query.hideArchived);
