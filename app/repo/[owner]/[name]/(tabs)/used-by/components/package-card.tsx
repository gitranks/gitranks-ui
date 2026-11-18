import { ArrowRight, Package } from 'lucide-react';
import type { Route } from 'next';
import NextLink from 'next/link';
import type { FC } from 'react';

import type { RepoPackage } from '@/graphql/repo-packages';
import { packagePath } from '@/utils/package-paths';

/** A card, as `ProfileCard` draws one, that is a link as a whole. */
const CARD =
  'flex w-full flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent/60 dark:shadow-none';

/**
 * A package the repository publishes, linking to its page: how many repositories with 100+ stars use it and its
 * downloads. `wide` for a repository's only package, with its role spelled out and "Package page".
 */
export const PackageCard: FC<{ pkg: RepoPackage; wide?: boolean }> = ({ pkg, wide = false }) => (
  <NextLink href={packagePath(pkg.name) as Route} prefetch={false} className={CARD}>
    {wide ? (
      <>
        <span className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <Package className="size-5" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-mono font-medium [overflow-wrap:anywhere]">{pkg.name}</span>
            <span className="text-xs text-muted-foreground">The npm package this repository publishes</span>
          </span>
        </span>
        <span className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {pkg.dependents.toLocaleString('en-US')}
            </span>{' '}
            <span className="text-xs text-muted-foreground">repos with 100+ stars use it</span>
          </span>
          <span>
            <span className="font-mono text-xl font-semibold tabular-nums">
              {pkg.downloadsLastWeek.toLocaleString('en-US')}
            </span>{' '}
            <span className="text-xs text-muted-foreground">downloads a week</span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-link">
            Package page
            <ArrowRight className="size-4" aria-hidden />
          </span>
        </span>
      </>
    ) : (
      <>
        <span className="font-mono text-sm font-medium [overflow-wrap:anywhere]">{pkg.name}</span>
        <span className="font-mono text-2xl font-semibold tabular-nums">{pkg.dependents.toLocaleString('en-US')}</span>
        <span className="text-xs text-muted-foreground">repos with 100+ stars use it</span>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums text-foreground">
            {pkg.downloadsLastWeek.toLocaleString('en-US')}
          </span>{' '}
          downloads a week
        </span>
      </>
    )}
  </NextLink>
);
