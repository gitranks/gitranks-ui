'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { OverviewPage } from './components/overview-page';
import { buildProfileTabSEO } from './seo';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageOverview(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('overview', user);
}

export default async function ProfileOverviewPage({ params }: PageProps<'/profile/[login]'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageOverview(login);

  return <OverviewPage user={user} isGlobalContext />;
}
