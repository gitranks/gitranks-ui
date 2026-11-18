import { Package } from 'lucide-react';
import type { Route } from 'next';
import NextLink from 'next/link';
import type { FC } from 'react';

import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RepoPackages } from '@/graphql/repo-packages';
import { packagePath } from '@/utils/package-paths';

const formatCount = (value: number) => value.toLocaleString('en-US');

/**
 * Every package a repository publishes, when there are four or more: how many repositories with 100+ stars use each
 * and its downloads, most used first. The API lists the top 50; the rest are counted.
 */
export const PackagesTable: FC<{ packages: Pick<RepoPackages, 'total' | 'items'> }> = ({ packages }) => {
  const more = packages.total - packages.items.length;

  return (
    <ProfileCard className="gap-0 p-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
        <h3 className="text-base font-semibold">{formatCount(packages.total)} packages</h3>
        <span className="text-sm text-muted-foreground">Sorted by repos with 100+ stars</span>
      </div>
      <Table>
        <TableHeader className="text-xs">
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 text-muted-foreground">Package</TableHead>
            <TableHead className="text-right text-muted-foreground">Used by (100+★ repos)</TableHead>
            <TableHead className="px-4 text-right text-muted-foreground">Downloads a week</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.items.map((pkg) => (
            <TableRow key={pkg.name}>
              <TableCell className="px-4 py-2.5 whitespace-normal">
                <NextLink
                  href={packagePath(pkg.name) as Route}
                  prefetch={false}
                  className="flex items-center gap-2 font-mono font-medium [overflow-wrap:anywhere] hover:underline"
                >
                  <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {pkg.name}
                </NextLink>
              </TableCell>
              <TableCell className="px-2 py-2.5 text-right font-mono tabular-nums">
                {pkg.dependents > 0 ? (
                  formatCount(pkg.dependents)
                ) : (
                  <span className="text-muted-foreground">none yet</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-2.5 text-right font-mono tabular-nums">
                {formatCount(pkg.downloadsLastWeek)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {more > 0 && <p className="border-t p-4 text-sm text-muted-foreground">and {formatCount(more)} more</p>}
    </ProfileCard>
  );
};
