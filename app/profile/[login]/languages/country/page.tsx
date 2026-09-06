'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import type { Metadata } from 'next/dist/lib/metadata/types/metadata-interface';

import { buildProfileTabSEO } from '../../seo';
import { LanguagesPage } from '../components/languages-page';
import { fetchProfilePageLanguages } from '@/graphql/helpers/fetch-profile-page-languages';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/languages/country'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageLanguages(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('languages', user);
}

export default async function ProfileLanguages({ params }: PageProps<'/profile/[login]/languages/country'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageLanguages(login, 'country');

  return <LanguagesPage user={user} />;
}
