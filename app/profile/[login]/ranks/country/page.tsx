'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface';

import { fetchProfilePageRanks } from '@/graphql/helpers/fetch-profile-page-ranks';
import { fetchProfileSeo } from '@/graphql/helpers/fetch-profile-seo';

import { buildProfileTabSEO } from '../../seo';
import { RanksPage } from '../components/ranks-page';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfileSeo(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('ranks', user);
}

export default async function ProfileRanks({ params }: Readonly<{ params: Promise<{ login: string }> }>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageRanks(login, 'country');

  return <RanksPage user={user} />;
}
