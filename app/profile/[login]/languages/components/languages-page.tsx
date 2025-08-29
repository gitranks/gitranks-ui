import { notFound } from 'next/navigation';
import { FC } from 'react';

import { LanguageRankCard } from '@/components/rank-card/language-rank-card';
import { PageProfileLanguagesQuery } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';
import { getRankingTierData } from '@/utils/calculate-tiers/calculate-tiers';

import { LayoutLeftColumn } from '../../components/layout-left-column';
import { ProfileCardsGrid } from '../../components/profile-card';
import { ProfileRankingSwitcher } from '../../components/profile-ranking-switcher';
import NotFound from '../../not-found';

type OverviewPageProps = {
  user: PageProfileLanguagesQuery['user'];
  isGlobalContext?: boolean;
};

export const LanguagesPage: FC<OverviewPageProps> = ({ user, isGlobalContext }) => {
  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { languages, login, country } = user;

  return (
    <LayoutLeftColumn user={user}>
      <>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Language Ranks Breakdown</h2>
          <ProfileRankingSwitcher countryName={country} />
        </div>

        <ProfileCardsGrid>
          {languages
            ?.filter((language) => language.score)
            .map((language) => {
              const { rankGlobal, rankCountry, tiersGlobal, tiersCountry } = language;
              const ranks = isGlobalContext ? rankGlobal : rankCountry;
              const tiers = isGlobalContext ? tiersGlobal : tiersCountry;

              const sTier = getRankingTierData(UserRankProp.s, ranks, tiers?.sUsers, tiers?.sTiers);
              const { s, sM } = ranks ?? {};

              return (
                <LanguageRankCard
                  key={language.name}
                  languageName={language.name}
                  languageColor={language.color}
                  tiers={tiers?.sTiers}
                  tierData={sTier}
                  rankType={UserRankProp.s}
                  rank={s}
                  rankM={sM}
                  score={user.s}
                  login={login}
                />
              );
            })}
        </ProfileCardsGrid>
      </>
    </LayoutLeftColumn>
  );
};
