import { notFound } from 'next/navigation';
import type { FC } from 'react';

import { RANK_DESCRIPTIONS } from '@/app/app.consts';
import { RankCard } from '@/components/rank-card/rank-card';
import type { PageProfileRanksQuery, RankTier } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';
import { calculateTiers } from '@/utils/calculate-tiers/calculate-tiers';
import { shortenCountryName } from '@/utils/country-name-shortener';
import { getTypeByRankProp } from '@/utils/get-rank-prop-by-ranking-type';
import { LayoutLeftColumn } from '../../components/layout-left-column';
import { ProfileCardsGrid } from '../../components/profile-card';
import { ProfileRankingSwitcher } from '../../components/profile-ranking-switcher';
import NotFound from '../../not-found';
import { ProfileRankCharts } from './profile-rank-charts';
import { RankBreakdownTooltip } from './rank-breakdown-tooltip';

type OverviewPageProps = {
  user: PageProfileRanksQuery['user'];
  isGlobalContext?: boolean;
};

export const RanksPage: FC<OverviewPageProps> = ({ user, isGlobalContext }) => {
  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { rankGlobal, rankCountry, tiersGlobal, tiersCountry, login, country } = user;

  const ranks = isGlobalContext ? rankGlobal : rankCountry;
  const tiers = isGlobalContext ? tiersGlobal : tiersCountry;
  const { sTier, cTier, fTier, bestTier } = calculateTiers(ranks, tiers as RankTier);
  const { s, c, f, sM, cM, fM, sProvisional, cProvisional, fProvisional } = ranks ?? {};

  const getRankingName = (rankType: UserRankProp) => {
    const { title } = RANK_DESCRIPTIONS[rankType];

    return `${title}ing${isGlobalContext ? '' : ` in ${shortenCountryName(country)}`}`;
  };

  const getRankingLink = (rankType: UserRankProp) => {
    if (isGlobalContext) {
      return `/by/${getTypeByRankProp(rankType)}/1`;
    } else {
      return `/country/${country}/${getTypeByRankProp(rankType)}/1`;
    }
  };

  return (
    <LayoutLeftColumn user={user}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Profile Ranks</h2>
        <ProfileRankingSwitcher countryName={country} />
      </div>
      <ProfileRankCharts
        rankChartTitle={isGlobalContext ? 'Global Rank' : `Rank in ${shortenCountryName(country)}`}
        sTier={sTier.data}
        cTier={cTier.data}
        fTier={fTier.data}
        bestTier={bestTier}
      />

      <h2 className="text-xl mt-4 flex items-center gap-2">
        Rank breakdown <RankBreakdownTooltip />
      </h2>
      <ProfileCardsGrid>
        <RankCard
          tiers={tiers?.sTiers}
          tierData={sTier}
          rankType={UserRankProp.s}
          rank={s}
          rankM={sM}
          rankProvisional={sProvisional}
          score={user.s}
          login={login}
          rankingName={getRankingName(UserRankProp.s)}
          rankingLink={getRankingLink(UserRankProp.s)}
        />
        <RankCard
          tiers={tiers?.cTiers}
          tierData={cTier}
          rankType={UserRankProp.c}
          rank={c}
          rankM={cM}
          rankProvisional={cProvisional}
          score={user.c}
          login={login}
          rankingName={getRankingName(UserRankProp.c)}
          rankingLink={getRankingLink(UserRankProp.c)}
        />
        <RankCard
          tiers={tiers?.fTiers}
          tierData={fTier}
          rankType={UserRankProp.f}
          rank={f}
          rankM={fM}
          rankProvisional={fProvisional}
          score={user.f}
          login={login}
          rankingName={getRankingName(UserRankProp.f)}
          rankingLink={getRankingLink(UserRankProp.f)}
        />
      </ProfileCardsGrid>
    </LayoutLeftColumn>
  );
};
