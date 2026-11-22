import { ArrowRight, Bell, ListOrdered, Package } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC } from 'react';

import { formatCompact, formatFull, GithubAvatar } from './landing-ui';
import {
  DEPENDENT_MIN_STARS,
  downloadsWindow,
  PACKAGE_RANKINGS,
  type PackageRankingOrder,
  packageRankingOf,
} from '@/app/packages/package-rankings';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { buttonVariants } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';
import { FOLLOW_CARD_TITLE } from '@/lib/follow/follow-copy';
import {
  DEFAULT_REGISTRY,
  DOWNLOADS_UNIT_TEXT,
  downloadsUnitOf,
  REGISTRIES,
  REGISTRY_IDS,
  registryLabelList,
} from '@/lib/packages/registries';
import { REGISTRY_ICONS } from '@/lib/packages/registry-icons';
import { cn } from '@/lib/utils';
import { packagePath, packageRankingPath } from '@/utils/package-paths';

/** One ranking's first rows, as the home page shows them. */
export type PackageBoard = { order: PackageRankingOrder; rows: PackageRankRows };

/** What the home page's package block reads: each ranking's top rows, how many packages are ranked, the downloads' last day. */
export type LandingPackages = {
  boards: PackageBoard[];
  /** How many packages are ranked; null when it could not be read. */
  ranked: number | null;
  /** The downloads ranking's last day, as written ("November 18, 2026"); null when unknown. */
  downloadsTo: string | null;
};

export const LANDING_PACKAGE_ROWS = 5;

const PACKAGES_PATH = '/packages' as Route;
const ACTION_CLASS = cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full');

/** The tabs' names: the rankings' own labels, as the ranking pages' "Rank by" names them. */
const tabOf = (order: PackageRankingOrder) => PACKAGE_RANKINGS[order].label;

/** "weekly downloads" while every listed registry counts them by the week; "downloads" once their units differ. */
const DOWNLOADS_RANKED_BY = (() => {
  const units = new Set(REGISTRY_IDS.flatMap((id) => downloadsUnitOf(id) ?? []));
  return units.size === 1 ? `${DOWNLOADS_UNIT_TEXT[[...units][0]].adjective} downloads` : 'downloads';
})();

const POINTS = [
  {
    icon: ListOrdered,
    title: 'Three rankings',
    text: `By ${DOWNLOADS_RANKED_BY}, by the stars of the repositories that use a package, and by how many of them use it.`,
  },
  {
    icon: Package,
    title: 'A page for every package',
    text: `Its ranks, the repositories with ${DEPENDENT_MIN_STARS}+ stars that depend on it, and a badge for its README.`,
  },
  { icon: Bell, title: 'Follow a package', text: `${FOLLOW_CARD_TITLE}.` },
];

/** What a tab's numbers count, under its rows. */
const basisOf = (order: PackageRankingOrder, downloadsTo: string | null) =>
  order === 'downloads'
    ? `Downloads ${downloadsWindow(downloadsTo, downloadsUnitOf(DEFAULT_REGISTRY) ?? undefined)}`
    : order === 'dependents'
      ? `Repositories with ${DEPENDENT_MIN_STARS}+ stars that use it directly`
      : `Stars of the repositories with ${DEPENDENT_MIN_STARS}+ stars that use it, added up`;

/** The owner's avatar, or the registry's mark for a package with no repository. */
const PackageMark: FC<{ url: string | null | undefined }> = ({ url }) => {
  if (url) return <GithubAvatar url={url} size={28} className="rounded-md" />;
  const Icon = REGISTRY_ICONS[DEFAULT_REGISTRY];
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
      <Icon aria-hidden className="size-3.5" />
    </span>
  );
};

/** One package: its rank and move, its name and description, the ranking's number (compact; in full on hover). */
const PackageRow: FC<{ row: PackageRankRows[number] }> = ({ row }) => (
  <li className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/60">
    <span className="w-12 shrink-0 font-mono text-sm whitespace-nowrap tabular-nums">
      {row.rank}
      <RankDelta current={row.rank} previous={row.previousRank} className="ml-1 font-mono" />
    </span>
    <Link
      href={packagePath(row.name, DEFAULT_REGISTRY)}
      prefetch={false}
      className="flex min-w-0 flex-1 items-center gap-2.5 hover:underline"
    >
      <PackageMark url={row.ownerAvatarUrl} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium" translate="no">
          {row.name}
        </span>
        {row.description && <span className="truncate text-xs text-muted-foreground">{row.description}</span>}
      </span>
    </Link>
    <span className="shrink-0 text-right font-mono text-sm tabular-nums" title={formatFull(row.value)}>
      {formatCompact(row.value)}
    </span>
  </li>
);

/**
 * The package rankings on the home page, in the place of a product section: the pitch with one call to action into
 * the rankings, and beside it the top of each ranking in tabs. All rows arrive with the page, so a tab sends no
 * request. Renders nothing when no ranking could be read.
 */
export const PackagesSection: FC<LandingPackages> = ({ boards, ranked, downloadsTo }) => {
  if (!boards.length) return null;

  // The rows and the count are the default registry's; the "for now" line names every listed registry.
  const registry = REGISTRIES[DEFAULT_REGISTRY].label;

  return (
    <section
      aria-labelledby="packages"
      className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            New
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Package rankings</span>
        </div>
        <h2 id="packages" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
          The {registry} packages open source runs on
        </h2>
        <p className="max-w-prose text-muted-foreground lg:text-lg">
          {ranked ? `${formatFull(ranked)} ${registry} packages` : `${registry} packages`}, ranked by downloads and by
          the GitHub repositories that depend on them.
        </p>
        <ul className="flex flex-col gap-4">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-start gap-2">
          <Link href={PACKAGES_PATH} prefetch={false} className={ACTION_CLASS}>
            See package rankings
            <ArrowRight aria-hidden />
          </Link>
          <span className="text-sm text-muted-foreground">
            {registryLabelList()} for now. More registries are on the way.
          </span>
        </div>
      </div>

      <Tabs
        defaultValue={boards[0].order}
        className="min-w-0 gap-0 overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
          <h3 className="font-semibold">Top {registry} packages</h3>
          <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0">
            <TabsList>
              {boards.map(({ order }) => (
                <TabsTrigger key={order} value={order}>
                  {tabOf(order)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        {boards.map(({ order, rows }) => (
          <TabsContent key={order} value={order} forceMount className="data-[state=inactive]:hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs text-muted-foreground">
              <span aria-hidden="true">#</span>
              <span>{packageRankingOf(order, DEFAULT_REGISTRY).metric}</span>
            </div>
            <ol className="flex flex-col divide-y">
              {rows.slice(0, LANDING_PACKAGE_ROWS).map((row) => (
                <PackageRow key={row.name} row={row} />
              ))}
            </ol>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              <span>{basisOf(order, downloadsTo)}</span>
              <Link
                href={packageRankingPath(order, 1, DEFAULT_REGISTRY)}
                prefetch={false}
                className="inline-flex items-center text-sm font-medium text-link max-sm:min-h-11"
              >
                Full ranking →
              </Link>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};
