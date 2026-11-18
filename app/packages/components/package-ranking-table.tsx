import type { FC } from 'react';
import { SiNpm } from 'react-icons/si';

import { formatPackageChange, formatPackageCount, type PackageRanking } from '../package-rankings';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { ClickableRow } from '@/components/ranking-table/clickable-row';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LinkWithStopPropagation } from '@/components/user-card/components/link-with-stop-propagation';
import { ProfileAvatar } from '@/components/user-card/components/profile-avatar';
import type { PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';
import { packagePath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

type PackageRankingTableProps = {
  ranking: Pick<PackageRanking, 'metric' | 'change'>;
  data: PackageRankRows;
  /** The registry's name in URLs: `npm`. */
  registry?: string;
};

/** The registry's mark, where a package has no repository whose owner's avatar could stand for it. */
const RegistryMark: FC = () => (
  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
    <SiNpm className="size-4" aria-hidden="true" />
  </span>
);

/** A rise in the positive colour and a fall in the negative one; no change in the row's own. */
const changeClass = (change: number) => {
  const rounded = Math.round(change);
  if (rounded > 0) return 'text-positive';
  return rounded < 0 ? 'text-negative' : undefined;
};

/**
 * A page of a package ranking: the rank and its move, the package with its description, the repository that publishes
 * it, the ranking's number and its change.
 */
export const PackageRankingTable: FC<PackageRankingTableProps> = ({ ranking, data, registry = 'npm' }) => (
  <Table>
    <TableHeader className="[&_tr]:border-b-0">
      <TableRow>
        <TableHead className="w-[100px]">Rank</TableHead>
        <TableHead>Package</TableHead>
        <TableHead className="hidden md:table-cell">Repository</TableHead>
        <TableHead className="text-right">{ranking.metric}</TableHead>
        <TableHead className="hidden sm:table-cell text-right">{ranking.change}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((row) => {
        const href = packagePath(row.name, registry);
        const repositoryName = row.repo?.nameWithOwner ?? row.repositoryName;
        const owner = repositoryName?.split('/')[0];

        return (
          <ClickableRow key={row.name} className="border-b-0" href={href}>
            <TableCell className="font-medium align-top">
              <div className="flex items-end gap-1">
                {row.rank}
                <RankDelta current={row.rank} previous={row.previousRank} />
              </div>
            </TableCell>
            <TableCell className="whitespace-normal">
              <div className="flex min-w-0 flex-col gap-1">
                <LinkWithStopPropagation href={href}>
                  {row.ownerAvatarUrl ? <ProfileAvatar url={row.ownerAvatarUrl} login={owner} /> : <RegistryMark />}
                  <span translate="no" className="min-w-0 [overflow-wrap:anywhere]">
                    {row.name}
                  </span>
                </LinkWithStopPropagation>
                {!!row.description && (
                  <p className="line-clamp-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                    {row.description}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {row.repo ? (
                <LinkWithStopPropagation href={getRepoPath(row.repo.nameWithOwner)} className="inline hover:underline">
                  {row.repo.nameWithOwner}
                </LinkWithStopPropagation>
              ) : (
                !!row.repositoryName && <span className="text-muted-foreground">{row.repositoryName}</span>
              )}
            </TableCell>
            <TableCell className="text-right">{formatPackageCount(row.value)}</TableCell>
            <TableCell className="hidden sm:table-cell text-right">
              {row.change !== null && row.change !== undefined && (
                <span className={changeClass(row.change)}>{formatPackageChange(row.change)}</span>
              )}
            </TableCell>
          </ClickableRow>
        );
      })}
    </TableBody>
  </Table>
);
