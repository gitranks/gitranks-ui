import type { FC } from 'react';

import { ArchivedChip } from './archived-chip';
import { ClickableRow } from '@/components/ranking-table/clickable-row';
import { RepoLink } from '@/components/repo-link/repo-link';
import { StarCount } from '@/components/star-count/star-count';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRepoPath } from '@/utils/repo-paths';

/** A repository that depends on a package. */
export type DependentRow = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  stars: number;
  archived: boolean;
  /** The packages of the page's repository it uses. */
  uses?: readonly string[];
};

type DependentsTableProps = {
  rows: readonly DependentRow[];
  /** The rank of the first row, less one: the rows before it on earlier pages. */
  offset?: number;
  /** A "Uses" column: which of the repository's packages each row uses. */
  showUses?: boolean;
};

/**
 * Repositories that depend on a package, most-starred first: rank, repository, optionally what it uses, stars. On a
 * phone the optional column moves under the name.
 */
export const DependentsTable: FC<DependentsTableProps> = ({ rows, offset = 0, showUses = false }) => (
  <Table>
    <TableHeader className="text-xs text-muted-foreground">
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-12 px-4 text-muted-foreground">#</TableHead>
        <TableHead className="text-muted-foreground">Most-starred dependents</TableHead>
        {showUses && <TableHead className="hidden text-muted-foreground md:table-cell">Uses</TableHead>}
        <TableHead className="px-4 text-right text-muted-foreground">Stars</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row, i) => (
        <ClickableRow
          key={`${offset + i}:${row.nameWithOwner}`}
          href={getRepoPath(row.nameWithOwner)}
          className="cursor-pointer"
        >
          <TableCell className="px-4 py-2.5 align-top font-mono tabular-nums">{offset + i + 1}</TableCell>
          <TableCell className="px-2 py-2.5 whitespace-normal">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <RepoLink
                  nameWithOwner={row.nameWithOwner}
                  ownerAvatarUrl={row.ownerAvatarUrl}
                  className="flex min-w-0 items-center gap-2 font-medium hover:underline"
                />
                {row.archived && <ArchivedChip />}
              </div>
              {showUses && !!row.uses?.length && (
                <span className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere] md:hidden">
                  {row.uses.join(', ')}
                </span>
              )}
            </div>
          </TableCell>
          {showUses && (
            <TableCell className="hidden px-2 py-2.5 align-top font-mono text-xs whitespace-normal text-muted-foreground md:table-cell">
              {row.uses?.join(', ')}
            </TableCell>
          )}
          <TableCell className="px-4 py-2.5 text-right align-top">
            <StarCount stars={row.stars} numberClassName="font-mono tabular-nums" />
          </TableCell>
        </ClickableRow>
      ))}
    </TableBody>
  </Table>
);
