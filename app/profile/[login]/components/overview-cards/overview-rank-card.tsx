import { FC, PropsWithChildren } from 'react';
import { FiGitPullRequest, FiStar, FiUsers, FiArrowRight } from 'react-icons/fi';

import { TIER_NAMES } from '@/app/app.consts';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import { Link } from '@/components/link/link';
import { RankChart } from '@/components/rank-chart/rank-chart';
import { PageProfileOverviewQuery, RankTier } from '@/types/generated/graphql';
import { calculateTiers } from '@/utils/calculate-tiers/calculate-tiers';
import { shortenCountryName } from '@/utils/country-name-shortener';
import { getPersonaType } from '@/utils/get-persona-type';

import { ProfileCard } from '../profile-card';
import { GlobalRankTooltip, PersonaTooltip } from '../tooltips';

type User = NonNullable<PageProfileOverviewQuery['user']>;

type ProfileRankCardProps = {
  login: string;
  ranks: User['rankGlobal'] | User['rankCountry'];
  tiers: User['tiersGlobal'] | User['tiersCountry'];
  country?: string | null;
};

const CardFooterRank: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex flex-col items-center text-sm border-r-1 px-3 text-muted-foreground min-w-[60px]">
      {children}
    </div>
  );
};

export const ProfileRankCard: FC<ProfileRankCardProps> = ({ login, ranks, tiers, country }) => {
  const { sTier, cTier, fTier, bestTier } = calculateTiers(ranks, tiers as RankTier);
  const sRank = ranks?.s ?? ranks?.sProvisional ?? 0;
  const cRank = ranks?.c ?? ranks?.cProvisional ?? 0;
  const fRank = ranks?.f ?? ranks?.fProvisional ?? 0;

  const getCardContent = () => {
    if (sTier?.notAvailable && cTier?.notAvailable && fTier?.notAvailable) {
      return (
        <div className="flex grow items-center">
          Not enough users yet! Ranking tiers unlock once at least 100 developers are ranked here.
        </div>
      );
    }

    if (!bestTier?.data?.tier) {
      return (
        <div className="flex grow items-center">
          No rank yet! You&apos;ll need 5 stars, 5 followers, or a merged PR in a 5★ repo to unlock your spot.
          You&apos;re just getting started - keep going!
        </div>
      );
    }

    return (
      <div className="flex flex-col grow justify-center gap-3">
        <div className="flex flex-col">
          <div className="">{country ? `Rank in ${shortenCountryName(country)}` : 'Global Rank'}</div>
          <AdaptiveTooltip
            trigger={
              <div className="text-2xl font-semibold underline decoration-dotted underline-offset-4">
                {TIER_NAMES[bestTier?.data?.tier - 1]} {bestTier?.data?.level}
              </div>
            }
          >
            <GlobalRankTooltip />
          </AdaptiveTooltip>
        </div>
        <div className="flex flex-col">
          <div className="">Persona</div>
          <AdaptiveTooltip
            trigger={
              <div className="text-2xl font-semibold underline decoration-dotted underline-offset-4">
                {getPersonaType(bestTier?.source)}
              </div>
            }
          >
            <PersonaTooltip />
          </AdaptiveTooltip>
        </div>
      </div>
    );
  };

  return (
    <ProfileCard className="gap-0 p-0 md:p-0">
      <div className="flex gap-2 grow">
        <div className="shrink-0 flex items-center">
          <RankChart progress={bestTier?.data} />
        </div>
        <div className="flex flex-col items-center grow p-3">{getCardContent()}</div>
      </div>
      <div className="h-12 flex items-center justify-between border-t-1 border-muted py-2 overflow-hidden">
        <div className="grid grid-cols-3">
          <CardFooterRank>
            <FiStar /> {sRank ? `#${sRank?.toLocaleString('en-US')}` : 'N/A'}
          </CardFooterRank>
          <CardFooterRank>
            <FiGitPullRequest /> {cRank ? `#${cRank?.toLocaleString('en-US')}` : 'N/A'}
          </CardFooterRank>
          <CardFooterRank>
            <FiUsers /> {fRank ? `#${fRank?.toLocaleString('en-US')}` : 'N/A'}
          </CardFooterRank>
        </div>

        <Link
          href={`/profile/${login}/ranks${country ? '/country' : ''}`}
          className="flex items-center justify-center px-3 min-w-[140px] gap-x-1"
        >
          Explore Ranks <FiArrowRight />
        </Link>
      </div>
    </ProfileCard>
  );
};
