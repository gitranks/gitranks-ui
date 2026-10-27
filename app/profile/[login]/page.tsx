'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { OverviewPage } from './components/overview-page';
import { buildProfileTabSEO } from './seo';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeUserCard } from '@/badge/v3/load';
import { fetchProfileOverviewExtras } from '@/graphql/helpers/fetch-profile-overview-extras';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';

export async function generateMetadata({ params }: PageProps<'/profile/[login]'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageOverview(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('overview', user).metadata;
}

export default async function ProfileOverviewPage({ params }: PageProps<'/profile/[login]'>) {
  const { login } = await params;
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageOverview(login);
  const [extras, badges] = await Promise.all([
    fetchProfileOverviewExtras(user),
    readBadgeFacts(user ? loadBadgeUserCard(user.login) : null),
  ]);
  // A page that rendered without a part it could not read is kept briefly, so the part comes back soon; so is one
  // whose badges await the profile's first read (their images carry the render's stamp).
  if (extras.complete && !badges.brief) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  return <OverviewPage user={user} extras={extras} badgeFacts={badges.facts} isGlobalContext />;
}
