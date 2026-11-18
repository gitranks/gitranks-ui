import { DEFAULT_REGISTRY, type RegistryId } from '@/lib/packages/registries';
import { buildRankingItemList } from '@/lib/seo/json-ld';
import type {
  CountryRankingsQuery,
  GlobalRankingsQuery,
  OrgRankingsQuery,
  PackageRankingsQuery,
  RepoRankingsQuery,
} from '@/types/generated/graphql';
import { getRankingConfigByType } from '@/utils/get-ranking-config-by-type';
import { packagePath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

type UserRows = GlobalRankingsQuery['globalRankings'] | CountryRankingsQuery['countryRankings'];

/** `ItemList` JSON-LD for the profiles a `RankingTable` shows, positioned by their rank. */
export function buildUserRankingItemList(
  name: string,
  path: string,
  rankingType: string,
  rows: UserRows,
  offset: number,
) {
  const [rankPropName] = getRankingConfigByType(rankingType);

  return buildRankingItemList(
    name,
    path,
    rows.flatMap((row, i) =>
      row.user?.login
        ? [
            {
              position: row[rankPropName] ?? offset + i + 1,
              name: row.user.login,
              path: `/profile/${encodeURIComponent(row.user.login)}`,
            },
          ]
        : [],
    ),
  );
}

/** `ItemList` JSON-LD for the organizations an `OrgRankingTable` shows. */
export function buildOrgRankingItemList(
  name: string,
  path: string,
  rows: OrgRankingsQuery['orgRankings'],
  offset: number,
) {
  return buildRankingItemList(
    name,
    path,
    rows.flatMap((row, i) =>
      row.organization?.login
        ? [
            {
              position: row.s ?? offset + i + 1,
              name: row.organization.login,
              path: `/org/${encodeURIComponent(row.organization.login)}`,
            },
          ]
        : [],
    ),
  );
}

/** `ItemList` JSON-LD for the repositories a `RepoRankingTable` shows; `rankProp` as the table's. */
export function buildRepoRankingItemList(
  name: string,
  path: string,
  rankProp: 's' | 'l',
  rows: RepoRankingsQuery['repoRankings'],
  offset: number,
) {
  return buildRankingItemList(
    name,
    path,
    rows.flatMap((row, i) =>
      row.repo
        ? [
            {
              position: row[rankProp] ?? offset + i + 1,
              name: row.repo.nameWithOwner,
              path: getRepoPath(row.repo.nameWithOwner),
            },
          ]
        : [],
    ),
  );
}

/** `ItemList` JSON-LD for the packages a `PackageRankingTable` shows, positioned by their rank. */
export function buildPackageRankingItemList(
  name: string,
  path: string,
  rows: NonNullable<PackageRankingsQuery['packageRankings']>,
  registry: RegistryId = DEFAULT_REGISTRY,
) {
  return buildRankingItemList(
    name,
    path,
    rows.map((row) => ({ position: row.rank, name: row.name, path: packagePath(row.name, registry) })),
  );
}
