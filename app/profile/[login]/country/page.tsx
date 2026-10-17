'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { OverviewPage } from '../components/overview-page';
import { buildProfileTabSEO } from '../seo';
import { fetchProfileOverviewExtras } from '@/graphql/helpers/fetch-profile-overview-extras';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/country'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageOverview(login, 'country');

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('overview', user, 'country').metadata;
}

export default async function ProfileOverviewPage({ params }: PageProps<'/profile/[login]/country'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageOverview(login, 'country');
  const extras = await fetchProfileOverviewExtras(user);

  return <OverviewPage user={user} extras={extras} />;
}
