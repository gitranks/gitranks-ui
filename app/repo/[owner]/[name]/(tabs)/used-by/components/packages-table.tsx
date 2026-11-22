import { Package } from 'lucide-react';
import type { Route } from 'next';
import NextLink from 'next/link';
import type { FC } from 'react';

import { RegistryChip } from './package-card';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { registryOfRepoPackage, spansRegistries } from '@/app/repo/[owner]/[name]/utils/repo-package-registry';
import { repoPackageDownloadsOf } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RepoPackages } from '@/graphql/repo-packages';
import { DOWNLOADS_UNIT_TEXT, REGISTRIES, spelledNameOf } from '@/lib/packages/registries';
import { packagePath } from '@/utils/package-paths';

const formatCount = (value: number) => value.toLocaleString('en-US');

/** A row's downloads: the count, with its own unit after it where the column holds two; a dash with none. */
const DownloadsCell: FC<{ pkg: RepoPackages['items'][number]; ownUnit: boolean }> = ({ pkg, ownUnit }) => {
  const downloads = repoPackageDownloadsOf(pkg);
  return (
    <TableCell className="px-4 py-2.5 text-right font-mono tabular-nums">
      {downloads ? (
        <>
          {formatCount(downloads.count)}
          {ownUnit && <span className="font-sans text-xs text-muted-foreground">{` ${downloads.per}`}</span>}
        </>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </TableCell>
  );
};

/**
 * Every package a repository publishes, when there are four or more: how many repositories with 100+ stars use each
 * and its downloads in its registry's unit, most used first. With one unit the column's head says it ("Downloads a
 * week"); with a week and a month each row says its own. A package with no count has a dash, and the column is left
 * out when no package's registry counts downloads. The API lists the top 50; the rest are counted.
 */
export const PackagesTable: FC<{ packages: Pick<RepoPackages, 'total' | 'items'> }> = ({ packages }) => {
  const more = packages.total - packages.items.length;
  // Packages on more than one registry name each one's.
  const registryChip = spansRegistries(packages.items);
  const units = new Set(packages.items.flatMap((pkg) => REGISTRIES[registryOfRepoPackage(pkg)].downloads ?? []));
  const [unit] = units;
  const head = units.size === 1 ? `Downloads ${DOWNLOADS_UNIT_TEXT[unit].per}` : 'Downloads';

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
            {units.size > 0 && <TableHead className="px-4 text-right text-muted-foreground">{head}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.items.map((pkg) => (
            <TableRow key={`${pkg.registry}/${pkg.name}`}>
              <TableCell className="px-4 py-2.5 whitespace-normal">
                <NextLink
                  href={packagePath(pkg.name, registryOfRepoPackage(pkg)) as Route}
                  prefetch={false}
                  className="flex items-center gap-2 font-mono font-medium [overflow-wrap:anywhere] hover:underline"
                >
                  <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {spelledNameOf(pkg)}
                  {registryChip && <RegistryChip label={REGISTRIES[registryOfRepoPackage(pkg)].label} />}
                </NextLink>
              </TableCell>
              <TableCell className="px-2 py-2.5 text-right font-mono tabular-nums">
                {pkg.dependents > 0 ? (
                  formatCount(pkg.dependents)
                ) : (
                  <span className="text-muted-foreground">none yet</span>
                )}
              </TableCell>
              {units.size > 0 && <DownloadsCell pkg={pkg} ownUnit={units.size > 1} />}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {more > 0 && <p className="border-t p-4 text-sm text-muted-foreground">and {formatCount(more)} more</p>}
    </ProfileCard>
  );
};
