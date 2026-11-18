import { parse } from 'graphql';

import type { PackageRegistry } from '@/graphql/repo-packages';
import type { DailyUpdateReason } from '@/types/generated/graphql';
import type DocumentNode from '@/types/typed-document-node';

/**
 * A package's page and its dependents, written out here rather than in `.gql` files: the fields are newer than the
 * generated schema, and an API that does not answer them yet fails only these operations. The types are written as the
 * generator writes them, so moving these into `.gql` files later changes no caller.
 */
const doc = <TData, TVariables extends Record<string, unknown>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** `READ`: the registry's facts are in; `NOT_READ`: a valid name nobody has read yet (every other field empty). */
export type PackageState = 'READ' | 'NOT_READ';

/** One point of a download history: the week's Monday, or the month's first day (UTC). */
export type PackageDownloadsPoint = { start: string; downloads: number };

/** A package's downloads up to `through`, the last day counted. */
export type PackageDownloads = {
  through: string;
  lastWeek: number;
  previousWeek: number;
  last30Days: number;
  previous30Days: number;
  last52Weeks: number;
  /** `null` until the history reaches back that far. */
  previous52Weeks?: number | null;
  /** Last week's downloads per star of the publishing repository; `null` without one. */
  perStar?: number | null;
  /** Weekly totals, oldest first, 104 at most. */
  weeks?: PackageDownloadsPoint[] | null;
  /** Whole calendar months, oldest first, 25 at most. */
  months?: PackageDownloadsPoint[] | null;
};

/** A rank of the last walk, and the one before. */
export type PackageRank = { rank: number; previousRank?: number | null };

/** The package's three ranks; each `null` where that ranking does not rank it. */
export type PackageRanks = {
  downloads?: PackageRank | null;
  dependentsStars?: PackageRank | null;
  dependents?: PackageRank | null;
};

/** A repository with 100+ stars that depends on the package directly. */
export type PackageDependent = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  stars: number;
  archived: boolean;
  /** The shallowest manifest that names the package. */
  manifestPath: string;
  /** Its version range as written there; `null` when blank. */
  versionRange?: string | null;
  /** How many of the repository's manifests name the package. */
  manifests: number;
};

/** One page of a package's dependents, most-starred first. */
export type PackageDependents = {
  /** Every row the page's filter keeps, across pages. */
  total: number;
  /** The package's archived dependents. */
  archived: number;
  items: PackageDependent[];
};

/** A package's daily updates: why it updates every day and when next. */
export type PackageDailyUpdates = {
  reasons: DailyUpdateReason[];
  nextUpdateAt?: string | null;
  lastUpdatedAt?: string | null;
};

/** Everything a package's page draws. */
export type PackagePage = {
  registry: PackageRegistry;
  /** The registry's spelling. */
  name: string;
  state: PackageState;
  description?: string | null;
  /** The publishing repository, when this site has its page. */
  repo?: { nameWithOwner: string; stars: number } | null;
  /** `owner/name` of the publishing repository, when it is known but this site has no page for it. */
  repositoryName?: string | null;
  latestVersion?: string | null;
  releaseCount?: number | null;
  firstPublishedAt?: string | null;
  /** The registry's user names, 20 at most. */
  maintainers: string[];
  maintainersCount: number;
  license?: string | null;
  /** The registry's deprecation notice. */
  deprecated?: string | null;
  downloadsReadAt?: string | null;
  dependentsReadAt?: string | null;
  nextDependentsReadAt?: string | null;
  refreshedAt?: string | null;
  /** `null` before the first read of its downloads. */
  downloads?: PackageDownloads | null;
  /** Repositories with 100+ stars that depend on it directly. */
  dependentsCount: number;
  /** Their stars, added up. */
  dependentsStars: number;
  /** `null` while no ranking ranks it. */
  ranks?: PackageRanks | null;
  /** The first page of its dependents; `null` for a package not read yet. */
  dependents?: PackageDependents | null;
  dailyUpdates?: PackageDailyUpdates | null;
  /** A refresh of the package is under way. */
  refreshRunning?: boolean | null;
};

export type PackagePageQuery = { package?: PackagePage | null };
export type PackagePageQueryVariables = { registry: PackageRegistry; name: string; limit: number };

/** `null` for a name the registry does not have. */
export const PackagePageDocument = doc<PackagePageQuery, PackagePageQueryVariables>(`
  query PackagePage($registry: PackageRegistry!, $name: String!, $limit: Int!) {
    package(registry: $registry, name: $name) {
      registry
      name
      state
      description
      repo {
        nameWithOwner
        stars
      }
      repositoryName
      latestVersion
      releaseCount
      firstPublishedAt
      maintainers
      maintainersCount
      license
      deprecated
      downloadsReadAt
      dependentsReadAt
      nextDependentsReadAt
      refreshedAt
      downloads {
        through
        lastWeek
        previousWeek
        last30Days
        previous30Days
        last52Weeks
        previous52Weeks
        perStar
        weeks {
          start
          downloads
        }
        months {
          start
          downloads
        }
      }
      dependentsCount
      dependentsStars
      ranks {
        downloads {
          rank
          previousRank
        }
        dependentsStars {
          rank
          previousRank
        }
        dependents {
          rank
          previousRank
        }
      }
      dependents(offset: 0, limit: $limit) {
        total
        archived
        items {
          nameWithOwner
          ownerAvatarUrl
          stars
          archived
          manifestPath
          versionRange
          manifests
        }
      }
      dailyUpdates {
        reasons
        nextUpdateAt
        lastUpdatedAt
      }
      refreshRunning
    }
  }
`);

export type PackageDependentsQuery = { package?: { dependents?: PackageDependents | null } | null };
export type PackageDependentsQueryVariables = {
  registry: PackageRegistry;
  name: string;
  offset: number;
  limit: number;
  hideArchived: boolean;
};

/** One page of a package's dependents; `null` for a name the registry does not have or one not read yet. */
export const PackageDependentsDocument = doc<PackageDependentsQuery, PackageDependentsQueryVariables>(`
  query PackageDependents(
    $registry: PackageRegistry!
    $name: String!
    $offset: Int!
    $limit: Int!
    $hideArchived: Boolean!
  ) {
    package(registry: $registry, name: $name) {
      dependents(offset: $offset, limit: $limit, hideArchived: $hideArchived) {
        total
        archived
        items {
          nameWithOwner
          ownerAvatarUrl
          stars
          archived
          manifestPath
          versionRange
          manifests
        }
      }
    }
  }
`);
