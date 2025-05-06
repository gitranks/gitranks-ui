import type { Metadata } from 'next';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileForMetadataDocument } from '@/types/generated/graphql';

import { ProfileTimeline } from './components/profile-timeline';
import { RanksOverview } from './components/ranks-overview';
import { RepositoriesOverview } from './components/repositories-overiview';
import { fetchProfileData } from './utils/fetch-profile-data';

type Props = {
  params: Promise<{ login: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { login } = await params;
  const { rankByLogin } = (await graphqlDirect(ProfileForMetadataDocument, { login })) ?? {};

  if (!rankByLogin?.user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  return {
    title: `${login} – GitHub Profile Analytics & Rankings · GitRanks`,
    openGraph: {
      images: [rankByLogin.user.avatarUrl!],
    },
  };
}

export default async function Profile({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    return null;
  }

  return (
    <div className="flex-grow flex flex-col gap-6">
      <div className="flex flex-col md:flex-row flex-wrap gap-6">
        <RanksOverview ranksData={user.rank} />
        <RepositoriesOverview
          repositories={user.repositories}
          contributions={user.contributions}
          ownedStars={user.ownedStars}
          contributedStars={user.contributedStars}
        />
      </div>
      <div>
        <ProfileTimeline timeline={user.timeline} firstSeenAt={user.firstSeenAt} />
      </div>
    </div>
  );
}
