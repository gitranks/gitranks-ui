import { parse } from 'graphql';

import type { ListedApiRegistry } from '@/lib/packages/registries';
import type DocumentNode from '@/types/typed-document-node';

/**
 * A repository's packages and the repositories that use them, written out here rather than in `.gql` files: the
 * fields are newer than the generated schema, and an API that does not answer them yet fails only these operations.
 * The types are written as the generator writes them, so moving these into `.gql` files later changes no caller.
 */
const doc = <TData, TVariables extends Record<string, unknown>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** The registries a package can be on, as the API names them: the site's registry table's. */
export type PackageRegistry = ListedApiRegistry;

/** One package a repository publishes, with how many repositories of 100+ stars use it. */
export type RepoPackage = {
  registry: PackageRegistry;
  /** The name the package's address is built from. */
  name: string;
  /** The name as the registry writes it; `null` where it is `name`. */
  displayName?: string | null;
  /** Distinct repositories with 100+ stars that depend on it directly. */
  dependents: number;
  downloadsLastWeek: number;
};

/** What a repository publishes, summed over its packages. */
export type RepoPackages = {
  /** How many packages it publishes. */
  total: number;
  /** The top packages by dependents (50 at most). */
  items: RepoPackage[];
  /** Distinct repositories with 100+ stars that depend on at least one of them. */
  dependents: number;
  dependentsArchived: number;
  downloadsLastWeek: number;
  dependentsReadAt?: string | null;
  nextDependentsReadAt?: string | null;
  downloadsReadAt?: string | null;
};

export type RepoPackagesQuery = { repo?: { packages?: RepoPackages | null } | null };
export type RepoPackagesQueryVariables = { owner: string; name: string };

/** `null` when the repository publishes no package. */
export const RepoPackagesDocument = doc<RepoPackagesQuery, RepoPackagesQueryVariables>(`
  query RepoPackages($owner: String!, $name: String!) {
    repo(owner: $owner, name: $name) {
      packages {
        total
        items {
          registry
          name
          displayName
          dependents
          downloadsLastWeek
        }
        dependents
        dependentsArchived
        downloadsLastWeek
        dependentsReadAt
        nextDependentsReadAt
        downloadsReadAt
      }
    }
  }
`);

/** A repository that uses one or more of another repository's packages. */
export type RepoUsedByItem = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  stars: number;
  archived: boolean;
  /** The names of the packages it uses. */
  uses: string[];
};

/** One page of the repositories that use a repository's packages, most-starred first. */
export type RepoUsedBy = {
  /** Every row the filter keeps, across pages. */
  total: number;
  /** How many of them are archived. */
  archived: number;
  items: RepoUsedByItem[];
};

export type RepoUsedByQuery = { repo?: { usedBy?: RepoUsedBy | null } | null };
export type RepoUsedByQueryVariables = {
  owner: string;
  name: string;
  offset?: number;
  limit?: number;
  /** One of the repository's packages; any other name answers an empty page. */
  package?: string | null;
  hideArchived?: boolean;
};

/** `null` when the repository publishes no package. */
export const RepoUsedByDocument = doc<RepoUsedByQuery, RepoUsedByQueryVariables>(`
  query RepoUsedBy(
    $owner: String!
    $name: String!
    $offset: Int = 0
    $limit: Int = 25
    $package: String
    $hideArchived: Boolean = false
  ) {
    repo(owner: $owner, name: $name) {
      usedBy(offset: $offset, limit: $limit, package: $package, hideArchived: $hideArchived) {
        total
        archived
        items {
          nameWithOwner
          ownerAvatarUrl
          stars
          archived
          uses
        }
      }
    }
  }
`);
