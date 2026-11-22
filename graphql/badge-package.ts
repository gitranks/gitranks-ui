import { parse } from 'graphql';

import type { PackageRegistry } from '@/graphql/repo-packages';
import type DocumentNode from '@/types/typed-document-node';

/**
 * What a package's badges read, written out here rather than in a `.gql` file: the fields are newer than the generated
 * schema, and an API that does not answer them yet fails only this operation. The types are written as the generator
 * writes them, so moving this into a `.gql` file later changes no caller.
 */
const doc = <TData, TVariables extends Record<string, unknown>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** How many of the most-starred dependents a badge reads: the chart draws eight. */
export const BADGE_DEPENDENTS = 8;

export type BadgePackageDependent = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  stars: number;
  archived: boolean;
};

/** As a package page's downloads: `lastWeek` and `previousWeek` are `null` on a registry counted a month at a time. */
export type BadgePackageDownloads = {
  through: string;
  lastWeek: number | null;
  previousWeek: number | null;
  last30Days: number;
  previous30Days: number;
  last52Weeks: number;
  previous52Weeks?: number | null;
  perStar?: number | null;
  weeks?: { start: string; downloads: number }[] | null;
  months?: { start: string; downloads: number }[] | null;
};

export type BadgePackage = {
  registry: PackageRegistry;
  name: string;
  state: 'READ' | 'NOT_READ';
  repo?: { nameWithOwner: string; stars: number } | null;
  repositoryName?: string | null;
  downloads?: BadgePackageDownloads | null;
  dependentsCount: number;
  dependentsStars: number;
  dependents?: { total: number; items: BadgePackageDependent[] } | null;
};

export type BadgePackageQuery = { package?: BadgePackage | null };
export type BadgePackageQueryVariables = { registry: PackageRegistry; name: string; limit: number };

/** A package's badge facts; `null` for a name the registry does not have. */
export const BadgePackageDocument = doc<BadgePackageQuery, BadgePackageQueryVariables>(`
  query BadgePackage($registry: PackageRegistry!, $name: String!, $limit: Int!) {
    package(registry: $registry, name: $name) {
      registry
      name
      state
      repo {
        nameWithOwner
        stars
      }
      repositoryName
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
      dependents(offset: 0, limit: $limit) {
        total
        items {
          nameWithOwner
          ownerAvatarUrl
          stars
          archived
        }
      }
    }
  }
`);
