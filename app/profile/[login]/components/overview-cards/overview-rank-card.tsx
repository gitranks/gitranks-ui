import type { FC, ReactNode } from 'react';

import { rankInfo } from '../../utils/profile-summary';
import { Eyebrow, MoreLink, ProfileCard } from '../profile-card';
import { GlobalRankTooltip, PersonaTooltip } from '../tooltips';
import { TIER_NAMES } from '@/app/app.consts';
import { RANK_NAME } from '@/badge/badge.consts';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { RankChart } from '@/components/rank-chart/rank-chart';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { tierTextClass } from '@/components/tier-chip/tier-chip';
import { TierIcon } from '@/components/tier-icon/tier-icon';
import { cn } from '@/lib/utils';
import type { PageProfileOverviewQuery, RankTier } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';
import { calculateTiers } from '@/utils/calculate-tiers/calculate-tiers';
import { shortenCountryName } from '@/utils/country-name-shortener';
import { getPersonaType } from '@/utils/get-persona-type';

type User = NonNullable<PageProfileOverviewQuery['user']>;

type ProfileRankCardProps = {
  login: string;
  ranks: User['rankGlobal'] | User['rankCountry'];
  tiers: User['tiersGlobal'] | User['tiersCountry'];
  country?: string | null;
  /** The ranks' scope, "worldwide" or "in Germany"; left out of the labels when unknown. */
  scope?: string;
};

const FOOTER_RANKINGS: { prop: UserRankProp; caption: string }[] = [
  { prop: UserRankProp.s, caption: 'Stars' },
  { prop: UserRankProp.c, caption: 'Contributions' },
  { prop: UserRankProp.f, caption: 'Followers' },
];

/** A value that opens an explanation: a button, so it can be reached and opened from the keyboard. */
const ExplainedValue: FC<{ children: ReactNode; explanation: ReactNode; className?: string }> = ({
  children,
  explanation,
  className,
}) => (
  <AdaptiveTooltip
    trigger={
      <button
        type="button"
        className={cn('self-start text-left underline decoration-dotted underline-offset-4', className)}
      >
        {children}
      </button>
    }
  >
    {explanation}
  </AdaptiveTooltip>
);

export const ProfileRankCard: FC<ProfileRankCardProps> = ({ login, ranks, tiers, country, scope }) => {
  const { sTier, cTier, fTier, bestTier } = calculateTiers(ranks, tiers as RankTier);
  // A provisional rank is marked in the label only; the footer looks the same.
  const labelOf = (prop: UserRankProp) =>
    `${RANK_NAME[prop]}${scope ? ` ${scope}` : ''}${rankInfo(ranks, prop)?.provisional ? ' (provisional)' : ''}`;

  const getCardContent = () => {
    if (sTier?.notAvailable && cTier?.notAvailable && fTier?.notAvailable) {
      return (
        <p className="text-sm text-muted-foreground">
          Not enough users yet! Ranking tiers unlock once at least 100 developers are ranked here.
        </p>
      );
    }

    if (!bestTier?.data?.tier) {
      return (
        <p className="text-sm text-muted-foreground">
          No rank yet! To unlock your spot you&apos;ll need 5 stars on your own repos, 5 followers, or 5 stars on
          others&apos; repos you&apos;ve contributed to. You&apos;re just getting started - keep going!
        </p>
      );
    }

    return (
      <>
        <div className="flex flex-col gap-0.5">
          <Eyebrow>{country ? `Rank in ${shortenCountryName(country)}` : 'Global rank'}</Eyebrow>
          <ExplainedValue
            explanation={<GlobalRankTooltip />}
            className={cn('text-2xl font-semibold tracking-tight', tierTextClass(bestTier.data.tier))}
          >
            {TIER_NAMES[bestTier.data.tier - 1]} {bestTier.data.level}
          </ExplainedValue>
        </div>
        <div className="flex flex-col gap-0.5">
          <Eyebrow>Persona</Eyebrow>
          <ExplainedValue explanation={<PersonaTooltip />} className="text-lg font-semibold">
            {getPersonaType(bestTier.source)}
          </ExplainedValue>
        </div>
      </>
    );
  };

  return (
    <ProfileCard className="gap-0 p-0 overflow-hidden">
      <div className="flex grow items-center gap-2">
        <div className="shrink-0">
          {/* The tier's insignia sits in the ring's center, as the repository tier card draws its Cosmic icon. */}
          <RankChart progress={bestTier?.data}>
            {bestTier?.data && (
              <TierIcon tier={bestTier.data.tier} className={cn('size-12', tierTextClass(bestTier.data.tier))} />
            )}
          </RankChart>
        </div>
        <div className="flex grow flex-col justify-center gap-3 py-4 pr-4">
          {getCardContent()}
          <MoreLink href={`/profile/${login}/ranks${country ? '/country' : ''}`}>Explore ranks</MoreLink>
        </div>
      </div>
      {/* Each rank's label is its ranking and scope, e.g. "Stars Rank worldwide": a tooltip, and text for readers of the HTML. */}
      <dl className="grid grid-cols-3 divide-x border-t">
        {FOOTER_RANKINGS.map(({ prop, caption }) => {
          const info = rankInfo(ranks, prop);
          const label = labelOf(prop);

          return (
            <div key={prop} className="flex flex-col items-center gap-0.5 px-2 py-3 text-center" title={label}>
              <dt className="sr-only">{label}:</dt>
              <dd className="flex flex-wrap items-baseline justify-center gap-x-1.5">
                <span
                  className={cn(
                    'font-mono text-sm font-semibold tabular-nums',
                    !info && 'font-normal text-muted-foreground',
                  )}
                >
                  {info ? `#${info.rank.toLocaleString('en-US')}` : 'N/A'}
                </span>
                {!info?.provisional && (
                  <RankDelta current={info?.rank} previous={ranks?.[`${prop}M`]} className="font-mono" />
                )}
              </dd>
              <dd className="text-xs text-muted-foreground" aria-hidden>
                {caption}
              </dd>
            </div>
          );
        })}
      </dl>
    </ProfileCard>
  );
};
