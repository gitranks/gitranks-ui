'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { buildProfileTabSEO } from '../../seo';
import { RanksPage } from '../components/ranks-page';
import { fetchProfilePageRanks } from '@/graphql/helpers/fetch-profile-page-ranks';
import { profileCacheTag } from '@/utils/profile-refresh';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/ranks/country'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageRanks(login, 'country');

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('ranks', user, 'country').metadata;
}

export default async function ProfileRanks({ params }: PageProps<'/profile/[login]/ranks/country'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(profileCacheTag(login));

  const user = await fetchProfilePageRanks(login, 'country');

  return <RanksPage user={user} />;
}
