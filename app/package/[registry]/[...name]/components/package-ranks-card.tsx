import NextLink from 'next/link';
import type { FC } from 'react';

import { packageRankingFirstOrder, packageRankingPageOf } from '@/app/packages/package-rankings';
import { MoreLink, ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { formatCount } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { Pill } from '@/components/pill/pill';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import type { PackagePage, PackageRank } from '@/graphql/package-page';
import { REGISTRIES, type RegistryId } from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

type PackageRanksCardProps = Pick<PackagePage, 'ranks'> & {
  registry: RegistryId;
};

/** The three rankings, in the menu's order: their order in the URL, and how a tile names them. */
const rankTilesOf = (label: string) => [
  { key: 'downloads', by: 'downloads', label: 'Downloads', title: `Rank by ${label} downloads` } as const,
  {
    key: 'dependentsStars',
    by: 'dependents-stars',
    label: 'Dependents’ stars',
    title: 'Rank by the stars of its dependents',
  } as const,
  {
    key: 'dependents',
    by: 'dependents',
    label: 'Dependents',
    title: 'Rank by repositories with 100+ stars using it',
  } as const,
];

const RankTile: FC<{ registry: RegistryId; rank: PackageRank; by: string; label: string; title: string }> = ({
  registry,
  rank,
  by,
  label,
  title,
}) => (
  <NextLink
    href={packageRankingPath(by, packageRankingPageOf(rank.rank), registry)}
    prefetch={false}
    title={title}
    className="flex flex-col gap-0.5 rounded-lg border bg-background p-3 no-underline transition-colors hover:border-primary/60"
  >
    <span className="flex flex-wrap items-baseline gap-x-1.5">
      <span className="font-mono text-xl font-semibold tracking-tight tabular-nums">#{formatCount(rank.rank)}</span>
      <RankDelta current={rank.rank} previous={rank.previousRank ?? undefined} className="font-mono text-xs" />
    </span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </NextLink>
);

/** Whether any ranking ranks it: the card is left out until one does. */
export const hasRanks = (ranks: PackagePage['ranks']) => !!ranks && rankTilesOf('').some(({ key }) => !!ranks[key]);

/**
 * "Ranks on npm": a tile per ranking that ranks it, each linking to the ranking's page it is on, and the way to every
 * ranking. How many use it and their stars are Used by's title.
 */
export const PackageRanksCard: FC<PackageRanksCardProps> = ({ registry, ranks }) => {
  const { label } = REGISTRIES[registry];
  const tiles = rankTilesOf(label).flatMap((tile) => {
    const rank = ranks?.[tile.key];
    return rank ? [{ ...tile, rank }] : [];
  });

  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{`Ranks on ${label}`}</h2>
          <Pill tone="violet" size="small">
            Beta
          </Pill>
        </div>
        <MoreLink href={packageRankingPath(packageRankingFirstOrder(registry), 1, registry)}>All ranks</MoreLink>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,96px),1fr))] gap-2">
        {tiles.map((tile) => (
          <RankTile
            key={tile.key}
            registry={registry}
            rank={tile.rank}
            by={tile.by}
            label={tile.label}
            title={tile.title}
          />
        ))}
      </div>
    </ProfileCard>
  );
};
