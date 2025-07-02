'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { fetchProfileData } from '@/graphql/helpers/fetch-profile-data';
import { fetchProfileTimeline } from '@/graphql/helpers/fetch-profile-timeline';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { ProfileTimeline } from './components/profile-timeline';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const { user } = await fetchProfileData(login);

  if (!user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  const { s, c, f } = user.rankGlobal ?? {};

  return {
    title: `${login} Timeline · GitRanks`,
    description: `Explore GitHub analytics for ${login} – ranked #${s} by stars, #${c} by contributions, and #${f} by followers. See how your code impacts the world and where you stand in the global developer community with GitRanks.`,
    openGraph: {
      images: [user.avatarUrl!],
    },
  };
}

export default async function Timeline({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  const { timeline } = await fetchProfileTimeline(login);

  return (
    <LayoutLeftColumn user={user} className="gap-6">
      <div className="pl-4">
        <ProfileTimeline timeline={timeline} firstSeenAt={user.firstSeenAt} />
      </div>
    </LayoutLeftColumn>
  );
}
