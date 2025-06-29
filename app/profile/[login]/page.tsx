'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from './components/layout-left-column';
import { MessengerIntegration } from './components/messenger-integration';
import { ProfileCardsGrid } from './components/profile-card';
import { ProfileTimeline } from './components/profile-timeline';
import { RanksOverview } from './components/ranks-overview';
import { RepositoriesOverview } from './components/repositories-overiview';
import NotFound from './not-found';
import { fetchProfileData } from '../../../graphql/helpers/fetch-profile-data';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  const { s, c, f } = user.rankGlobal ?? {};

  return {
    title: `${login} – GitHub Profile Analytics & Rankings · GitRanks`,
    description: `Explore GitHub analytics for ${login} – ranked #${s} by stars, #${c} by contributions, and #${f} by followers. See how your code impacts the world and where you stand in the global developer community with GitRanks.`,
    openGraph: {
      images: [user.avatarUrl!],
    },
  };
}

export default async function Profile({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    // nextjs not found page
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.rankGlobal) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  return (
    <LayoutLeftColumn user={user} className="gap-6">
      <>
        <MessengerIntegration login={user.login} />
        <ProfileCardsGrid>
          <RanksOverview title="Global Ranks" ranksData={user.rankGlobal} detailsLink={`/profile/${login}/ranks`} />
          {user.rankCountry && (
            <RanksOverview
              title={`Ranks in ${user.country}`}
              ranksData={user.rankCountry}
              detailsLink={`/profile/${login}/ranks/country`}
            />
          )}
          <RepositoriesOverview
            topRepoStars={user.repositories?.[0]?.stargazerCount ?? 0}
            contributedRepoCount={user.contributedRepoCount}
            repositoriesCount={user.repositoriesCount}
            s={user.s}
            c={user.c}
            login={login}
          />
        </ProfileCardsGrid>
        <div>
          <ProfileTimeline timeline={user.timeline} firstSeenAt={user.firstSeenAt} />
        </div>
      </>
    </LayoutLeftColumn>
  );
}
