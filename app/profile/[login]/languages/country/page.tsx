'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { buildProfileTabSEO } from '../../seo';
import { LanguagesPage } from '../components/languages-page';
import { fetchProfilePageLanguages } from '@/graphql/helpers/fetch-profile-page-languages';
import { profileCacheTag } from '@/utils/profile-refresh';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/languages/country'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageLanguages(login, 'country');

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('languages', user, 'country').metadata;
}

export default async function ProfileLanguages({ params }: PageProps<'/profile/[login]/languages/country'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(profileCacheTag(login));

  const user = await fetchProfilePageLanguages(login, 'country');

  return <LanguagesPage user={user} />;
}
