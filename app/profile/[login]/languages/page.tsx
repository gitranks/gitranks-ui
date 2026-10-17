'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { buildProfileTabSEO } from '../seo';
import { LanguagesPage } from './components/languages-page';
import { fetchProfilePageLanguages } from '@/graphql/helpers/fetch-profile-page-languages';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/languages'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfilePageLanguages(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('languages', user).metadata;
}

export default async function ProfileLanguages({ params }: PageProps<'/profile/[login]/languages'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageLanguages(login);

  return <LanguagesPage user={user} isGlobalContext />;
}
