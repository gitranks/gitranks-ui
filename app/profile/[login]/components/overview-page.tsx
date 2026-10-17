import { notFound } from 'next/navigation';
import type { FC } from 'react';

import NotFound from '../not-found';
import { UserContributionsList } from '../repositories/components/user-contributions-list';
import { UserRepositoriesList } from '../repositories/components/user-repositories-list';
import { buildProfileTabSEO } from '../seo';
import { ProfileTimeline } from '../timeline/components/profile-timeline';
import { buildProfileSummary, countryInSentence } from '../utils/profile-summary';
import { buildRankHistory } from '../utils/rank-history';
import { LayoutLeftColumn } from './layout-left-column';
import { MessengerIntegration } from './messenger-integration';
import { OsContributionsCard } from './overview-cards/os-contributions-card';
import { OverviewCardsContainer } from './overview-cards/overview-cards';
import { ProfileLanguageCard } from './overview-cards/overview-language-card';
import { ProfileRankCard } from './overview-cards/overview-rank-card';
import { OwnProjectsCard } from './overview-cards/own-projects-card';
import { ProfileBadgesSection } from './profile-badges-section';
import { ProfileSummary } from './profile-summary';
import { RankHistoryTable } from './rank-history-table';
import { StarsRankNeighbours } from './stars-rank-neighbours';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Link } from '@/components/link/link';
import type { ProfileOverviewExtras } from '@/graphql/helpers/fetch-profile-overview-extras';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

type OverviewPageProps = {
  user: PageProfileOverviewQuery['user'];
  extras?: ProfileOverviewExtras;
  isGlobalContext?: boolean;
};

export const OverviewPage: FC<OverviewPageProps> = ({ user, extras, isGlobalContext }) => {
  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const {
    s,
    c,
    f,
    sLangs,
    cLangs,
    country,
    login,
    repositories,
    contributions,
    timeline,
    repositoriesCount,
    contributedRepoCount,
    firstSeenAt,
    snapshots,
    starsReview,
  } = user;

  const ranks = isGlobalContext ? user.rankGlobal : user.rankCountry;
  const tiers = isGlobalContext ? user.tiersGlobal : user.tiersCountry;

  const summary = buildProfileSummary({
    login,
    name: user.name,
    country,
    scores: { s, c, f },
    rankGlobal: user.rankGlobal,
    rankCountry: user.rankCountry,
    rankedGlobal: extras?.rankedGlobal,
    rankedCountry: extras?.rankedCountry,
    repositories,
    languages: sLangs,
    updatedAt: user.githubFetchedAt,
  });
  const rankHistory = buildRankHistory({
    ranks,
    scores: { s, c, f },
    rankSnapshots: ranks?.snapshots,
    scoreSnapshots: snapshots,
  });

  return (
    <LayoutLeftColumn user={user} className="gap-10">
      <JsonLd payloads={buildProfileTabSEO('overview', user, isGlobalContext ? 'global' : 'country').jsonLd} />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Profile Overview</h2>
        <ProfileSummary parts={summary} />

        <OverviewCardsContainer>
          <ProfileRankCard login={login} ranks={ranks} tiers={tiers} country={isGlobalContext ? null : country} />
          <ProfileLanguageCard login={login} languages={sLangs} />
          <OwnProjectsCard
            login={login}
            repoCount={repositoriesCount ?? 0}
            repoStars={s ?? 0}
            languages={sLangs}
            snapshots={snapshots}
            totalRankedUsers={tiers?.sUsers ?? 0}
            userRank={ranks?.sProvisional || ranks?.s}
            starsReview={starsReview}
          />
          <OsContributionsCard
            login={login}
            repoCount={contributedRepoCount ?? 0}
            repoStars={c ?? 0}
            languages={cLangs}
            snapshots={snapshots}
            totalRankedUsers={tiers?.cUsers ?? 0}
            userRank={ranks?.cProvisional || ranks?.c}
          />
        </OverviewCardsContainer>
      </div>

      {!!repositoriesCount && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-semibold">{repositoriesCount > 5 ? 'Top 5 Repositories' : 'Repositories'}</h3>
          <UserRepositoriesList repositories={repositories} login={login} loadMore={false} />
          {repositoriesCount > 5 && (
            <Link href={`/profile/${login}/repositories`}>{`View all ${repositoriesCount} repositories`}</Link>
          )}
        </div>
      )}

      {!!contributions?.length && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-semibold">Last Contributions</h3>
          <UserContributionsList contributions={contributions} login={login} contributionCount={false} />
          <Link href={`/profile/${login}/repositories`}>View all contributions</Link>
        </div>
      )}

      <RankHistoryTable
        history={rankHistory}
        scope={isGlobalContext || !country ? 'worldwide' : `in ${countryInSentence(country)}`}
      />

      {isGlobalContext && <StarsRankNeighbours login={login} neighbours={extras?.starsNeighbours ?? []} />}

      {!!timeline?.length && <ProfileTimeline timeline={timeline} firstSeenAt={firstSeenAt} />}

      <ProfileBadgesSection login={login} scores={{ s, c, f }} ranks={user.rankGlobal ?? null} />

      <MessengerIntegration login={login} />
    </LayoutLeftColumn>
  );
};
