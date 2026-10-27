import type { FC, ReactNode } from 'react';

import { repoTierGoal } from '../utils/repo-tier';
import { REPO_TIER_NAMES } from '@/app/app.consts';
import { Eyebrow, MoreLink, ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { RankChart } from '@/components/rank-chart/rank-chart';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { repoTierLabel } from '@/components/repo-tier-chip/repo-tier-chip';
import { RepoTierIcon } from '@/components/repo-tier-icon/repo-tier-icon';
import { tierTextClass } from '@/components/tier-chip/tier-chip';
import { cn } from '@/lib/utils';
import type { PageRepoQuery, RepoRankTiersQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { getRankingPageOf, getRepoRankingPath } from '@/utils/repo-paths';

type Repo = NonNullable<PageRepoQuery['repo']>;
type Rank = NonNullable<Repo['rank']>;
type Tier = NonNullable<Rank['tier']>;

type RepoTierCardProps = {
  rank: Rank & { tier: Tier };
  stars: number;
  gainedThisMonth?: number | null;
  /** The global tier table, for the stars to the next bucket. */
  tiers?: NonNullable<RepoRankTiersQuery['repoRankTiers']>['tiers'] | null;
};

const FooterValue: FC<{ value: string; delta?: ReactNode; caption: string; label: string }> = ({
  value,
  delta,
  caption,
  label,
}) => (
  <div className="flex flex-col items-center gap-0.5 px-2 py-3 text-center" title={label}>
    <dt className="sr-only">{label}:</dt>
    <dd className="flex flex-wrap items-baseline justify-center gap-x-1.5">
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
      {delta}
    </dd>
    <dd className="text-xs text-muted-foreground" aria-hidden>
      {caption}
    </dd>
  </div>
);

/** A repository's tier as the profile shows a developer's: the ring of tiers with its glyph, the tier, its ranks. */
export const RepoTierCard: FC<RepoTierCardProps> = ({ rank, stars, gainedThisMonth, tiers }) => {
  const { tier, languageTier } = rank;
  const goal = repoTierGoal(tier, stars, tiers);
  const languageName = rank.language ?? 'No language';

  return (
    <ProfileCard className="gap-0 p-0 overflow-hidden">
      <div className="flex grow items-center gap-2">
        <div className="shrink-0">
          <RankChart progress={tier} labels={REPO_TIER_NAMES}>
            <RepoTierIcon tier={tier.tier} variant="large" className={cn('size-12', tierTextClass(tier.tier))} />
          </RankChart>
        </div>
        <div className="flex grow flex-col justify-center gap-3 py-4 pr-4">
          <div className="flex flex-col gap-0.5">
            <Eyebrow as="h2">Repository tier</Eyebrow>
            <span className={cn('text-2xl font-semibold tracking-tight', tierTextClass(tier.tier))}>
              {repoTierLabel(tier)}
            </span>
            {goal && <span className="text-sm">{goal}</span>}
          </div>
          {!!languageTier && (
            <div className="flex flex-col gap-0.5">
              <Eyebrow>In {languageName}</Eyebrow>
              <span className={cn('text-lg font-semibold', tierTextClass(languageTier.tier))}>
                {repoTierLabel(languageTier)}
              </span>
            </div>
          )}
          {!!rank.s && <MoreLink href={getRepoRankingPath(getRankingPageOf(rank.s))}>Explore ranks</MoreLink>}
        </div>
      </div>
      <dl className="grid grid-cols-3 divide-x border-t">
        <FooterValue
          value={rank.s ? `#${rank.s.toLocaleString('en-US')}` : 'N/A'}
          delta={<RankDelta current={rank.s} previous={rank.sM} className="font-mono" />}
          caption="Global"
          label="Global repository rank"
        />
        <FooterValue
          value={rank.l ? `#${rank.l.toLocaleString('en-US')}` : 'N/A'}
          delta={<RankDelta current={rank.l} previous={rank.lM} className="font-mono" />}
          caption={languageName}
          label={`Rank in ${languageName}`}
        />
        <FooterValue
          value={gainedThisMonth ? `${gainedThisMonth > 0 ? '+' : ''}${formatNumberShort(gainedThisMonth)}` : '0'}
          caption="Stars this month"
          label={`Stars this month (of ${formatNumberShort(stars)})`}
        />
      </dl>
    </ProfileCard>
  );
};
