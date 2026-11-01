import { notFound } from 'next/navigation';
import type { FC } from 'react';

import NotFound from '../not-found';
import { UserContributionsList } from '../repositories/components/user-contributions-list';
import { UserRepositoriesList } from '../repositories/components/user-repositories-list';
import { buildProfileTabSEO } from '../seo';
import { ProfileTimeline } from '../timeline/components/profile-timeline';
import { buildProfileSummary } from '../utils/profile-summary';
import { buildRankHistory } from '../utils/rank-history';
import { LayoutLeftColumn } from './layout-left-column';
import { MessengerIntegration } from './messenger-integration';
import { OsContributionsCard } from './overview-cards/os-contributions-card';
import { OverviewCardsContainer } from './overview-cards/overview-cards';
import { ProfileLanguageCard } from './overview-cards/overview-language-card';
import { ProfileRankCard } from './overview-cards/overview-rank-card';
import { OwnProjectsCard } from './overview-cards/own-projects-card';
import { MoreLink, ProfileSection } from './profile-card';
import { ProfileIssuesForYou } from './profile-issues-for-you';
import { ProfileSummary } from './profile-summary';
import { RankHistoryTable } from './rank-history-table';
import { StarsReviewNote } from './stars-review-note';
import type { UserFacts } from '@/badge/v3/facts';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import type { ProfileOverviewExtras } from '@/graphql/helpers/fetch-profile-overview-extras';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { countryInSentence } from '@/utils/country-in-sentence';

type OverviewPageProps = {
  user: PageProfileOverviewQuery['user'];
  extras?: ProfileOverviewExtras;
  /** The profile's badge data, for its Badges card. */
  badgeFacts?: UserFacts | null;
  isGlobalContext?: boolean;
};

export const OverviewPage: FC<OverviewPageProps> = ({ user, extras, badgeFacts, isGlobalContext }) => {
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
  // The scope of `ranks`. A profile without a country has no country ranks, so the country tab has none.
  const scope = isGlobalContext ? 'worldwide' : country ? `in ${countryInSentence(country)}` : undefined;

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

      <div className="flex flex-col gap-4">
        <h2 className="sr-only">Profile overview</h2>
        <StarsReviewNote login={login} starsReview={starsReview} />
        {/* The owner's own block, read in the browser after the cached page loads: nothing for anyone else. */}
        <ProfileIssuesForYou login={login} />

        <OverviewCardsContainer>
          <ProfileRankCard
            login={login}
            ranks={ranks}
            tiers={tiers}
            country={isGlobalContext ? null : country}
            scope={scope}
          />
          <ProfileLanguageCard login={login} languages={sLangs} />
          <OwnProjectsCard
            login={login}
            repoCount={repositoriesCount ?? 0}
            repoStars={s ?? 0}
            starsNotCounted={user.starsNotCounted}
            languages={sLangs}
            snapshots={snapshots}
            totalRankedUsers={tiers?.sUsers ?? 0}
            userRank={ranks?.sProvisional || ranks?.s}
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
        <ProfileSummary parts={summary} />
      </div>

      {!!repositoriesCount && (
        <ProfileSection
          id="top-repositories"
          title={repositoriesCount > 5 ? 'Top 5 repositories' : 'Repositories'}
          action={
            repositoriesCount > 5 && (
              <MoreLink href={`/profile/${login}/repositories`}>
                All {repositoriesCount.toLocaleString('en-US')} repositories
              </MoreLink>
            )
          }
        >
          <UserRepositoriesList repositories={repositories} login={login} loadMore={false} />
        </ProfileSection>
      )}

      {!!contributions?.length && (
        <ProfileSection
          id="recent-contributions"
          title="Recent contributions"
          action={<MoreLink href={`/profile/${login}/repositories`}>All contributions</MoreLink>}
        >
          <UserContributionsList contributions={contributions} login={login} contributionCount={false} />
        </ProfileSection>
      )}

      {!!scope && <RankHistoryTable history={rankHistory} scope={scope} />}

      {!!timeline?.length && <ProfileTimeline timeline={timeline} firstSeenAt={firstSeenAt} />}

      <div className="grid gap-4 md:gap-6 lg:has-[>:nth-child(2)]:grid-cols-[2fr_1fr]">
        <BadgesCard entity={badgeFacts ?? null} />
        <MessengerIntegration login={login} />
      </div>
    </LayoutLeftColumn>
  );
};
