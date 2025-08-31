import { Star, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { FC } from 'react';

import { DEFAULT_LANGUAGE_COLOR, NOT_AVAILABLE } from '@/app/app.consts';
import { UserRankProp } from '@/types/ranking.types';
import { getRankingTierData } from '@/utils/calculate-tiers/calculate-tiers';
import { shortenCountryName } from '@/utils/country-name-shortener';
import { getPercentileRank } from '@/utils/get-percentile-rank';

import { NextTierThreshold } from './next-tier-threshold';
import { RankCardItem, RankCardPosition, RankCardTotalProfilesRanked } from './rank-card-item';
import { LanguageRankCardProps } from './rank-card.types';
import { TierValue } from './tier-value';
import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '../../app/profile/[login]/components/profile-card';
import { RankDelta } from '../rank-delta/rank-delta';

export const LanguageRankCard: FC<LanguageRankCardProps> = ({ language, country, isGlobalContext }) => {
  const { rankGlobal, rankCountry, tiersGlobal, tiersCountry, name, color, score } = language ?? {};
  const ranks = isGlobalContext ? rankGlobal : rankCountry;
  const { sTiers, sUsers = 0 } = (isGlobalContext ? tiersGlobal : tiersCountry) ?? {};
  const tierData = getRankingTierData(UserRankProp.s, ranks, sUsers, sTiers);
  const { s, sM } = ranks ?? {};
  const { notRanked, notAvailable, rankedCount, data } = tierData ?? {};

  if (notRanked) {
    return null;
  }

  const hasData = !notRanked && !notAvailable && data !== undefined;
  const rankingLink = `/language/${name}/${isGlobalContext ? 'global' : country}/1`;

  const getCardContent = () => {
    const rankToDisplay = s || 0;
    const rankPercentile = getPercentileRank(rankToDisplay, rankedCount);

    return (
      <>
        <RankCardPosition rank={rankToDisplay} rankedCount={rankedCount} rankingLink={rankingLink} />
        <RankCardItem Icon={Star}>Language Score: {(score || 0).toLocaleString('en-US')}</RankCardItem>
        {!!rankPercentile && <RankCardItem Icon={Trophy}>Top {rankPercentile}% of all ranked profiles</RankCardItem>}
        {rankToDisplay !== sM && (
          <RankCardItem Icon={rankToDisplay > (sM || 0) ? TrendingDown : TrendingUp}>
            <span>
              This month change: <RankDelta current={rankToDisplay} previous={sM} className="text-base" />
            </span>
          </RankCardItem>
        )}
      </>
    );
  };

  const getNotAvailableRankContent = () => {
    const rankToDisplay = s ?? 0;
    const hasRank = rankToDisplay <= rankedCount && rankToDisplay > 0;

    return (
      <>
        <RankCardItem>{NOT_AVAILABLE}</RankCardItem>
        <RankCardItem Icon={Star}>Language Score: {(score || 0).toLocaleString('en-US')}</RankCardItem>
        {hasRank && <RankCardPosition rank={rankToDisplay} rankedCount={rankedCount} rankingLink={rankingLink} />}
        {!hasRank && !!rankedCount && (
          <RankCardTotalProfilesRanked rankedCount={rankedCount} rankingLink={rankingLink} />
        )}
      </>
    );
  };

  const getRankingName = () => {
    return `${name} Language Ranking${isGlobalContext && country ? '' : ` in ${shortenCountryName(country)}`}`;
  };

  return (
    <ProfileCard className="gap-0">
      <div className="flex">
        <div className="grow">
          <ProfileCardHeader>
            <div className="flex gap-2 items-center">
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color ?? DEFAULT_LANGUAGE_COLOR }} />
              {name}
            </div>
          </ProfileCardHeader>
          <TierValue
            tierData={tierData}
            tiers={sTiers}
            rankedCount={rankedCount}
            rankType={UserRankProp.s}
            rankingName={getRankingName()}
          />
        </div>
        <NextTierThreshold tierData={tierData} tiers={sTiers} rankType={UserRankProp.s} score={score} />
      </div>

      <ProfileCardContent className="mt-4">
        {notAvailable && getNotAvailableRankContent()}
        {hasData && getCardContent()}
      </ProfileCardContent>
    </ProfileCard>
  );
};
