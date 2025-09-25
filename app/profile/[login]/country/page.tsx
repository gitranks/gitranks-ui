'use cache';

import type { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';

import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';

import { OverviewPage } from '../components/overview-page';
import { buildProfileTabSEO } from '../seo';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/country'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageOverview(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('overview', user);
}

export default async function ProfileOverviewPage({ params }: PageProps<'/profile/[login]/country'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageOverview(login, 'country');

  return <OverviewPage user={user} />;
}
