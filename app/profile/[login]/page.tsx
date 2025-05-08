import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from './components/layout-left-column';
import { ProfileTimeline } from './components/profile-timeline';
import { RanksOverview } from './components/ranks-overview';
import { RepositoriesOverview } from './components/repositories-overiview';
import { fetchProfileData } from './utils/fetch-profile-data';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  const { ownedStars, contributedStars, followersCount } = user.rank ?? {};

  return {
    title: `${login} – GitHub Profile Analytics & Rankings · GitRanks`,
    description: `Explore GitHub analytics for ${login} – ranked #${ownedStars} by stars, #${contributedStars} by contributions, and #${followersCount} by followers. See how your code impacts the world and where you stand in the global developer community with GitRanks.`,
    openGraph: {
      images: [user.avatarUrl!],
    },
  };
}

export default async function Profile({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  return (
    <LayoutLeftColumn user={user}>
      <div className="flex-grow flex flex-col gap-6">
        <div className="flex flex-col md:flex-row flex-wrap gap-6">
          <RanksOverview ranksData={user.rank} login={login} />
          <RepositoriesOverview
            repositories={user.repositories}
            contributions={user.contributions}
            ownedStars={user.ownedStars}
            contributedStars={user.contributedStars}
            login={login}
          />
        </div>
        <div>
          <ProfileTimeline timeline={user.timeline} firstSeenAt={user.firstSeenAt} />
        </div>
      </div>
    </LayoutLeftColumn>
  );
}
