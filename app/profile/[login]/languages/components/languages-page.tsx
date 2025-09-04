import { notFound } from 'next/navigation';
import { FC, useMemo } from 'react';

import { LanguageRankCard } from '@/components/rank-card/language-rank-card';
import { PageProfileLanguagesQuery, UserLanguage } from '@/types/generated/graphql';

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

  const langsWithScore = useMemo(() => {
    return user.languages?.filter((lang) => lang.score);
  }, [user]);

  const ranksAreNotReady = useMemo(() => {
    const rankProp = isGlobalContext ? 'rankGlobal' : 'rankCountry';
    const langsWithRank = langsWithScore?.filter((lang) => lang[rankProp]);

    return !!langsWithScore?.length && !langsWithRank?.length;
  }, [langsWithScore, isGlobalContext]);

  const ranksAreNotAvailable = !langsWithScore?.length;

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  return (
    <LayoutLeftColumn user={user}>
      <>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Language Ranks Breakdown</h2>
          <ProfileRankingSwitcher countryName={user.country} />
        </div>

        {ranksAreNotReady && (
          <p>
            Your language rankings aren&apos;t ready yet! We&apos;ve just discovered your profile, and language rankings
            are recalculated every other day. Check back soon to see your results.
          </p>
        )}

        {ranksAreNotAvailable ? (
          <p>
            No language rankings yet! We parsed languages from your public repositories, but none have enough stars to
            generate rankings. Once your projects gain stars, we&apos;ll show your top languages here.
          </p>
        ) : (
          <ProfileCardsGrid>
            {langsWithScore?.map((language) => (
              <LanguageRankCard
                key={language.name}
                language={language as UserLanguage}
                isGlobalContext={isGlobalContext}
                country={user.country}
              />
            ))}
          </ProfileCardsGrid>
        )}
      </>
    </LayoutLeftColumn>
  );
};
