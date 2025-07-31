'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { fetchProfileData } from '@/graphql/helpers/fetch-profile-data';
import { fetchProfileTimeline } from '@/graphql/helpers/fetch-profile-timeline';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { ProfileTimeline } from './components/profile-timeline';

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
