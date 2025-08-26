'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { fetchProfileRepositories } from '@/graphql/helpers/fetch-profile-repositories';
import { fetchProfileSeo } from '@/graphql/helpers/fetch-profile-seo';

import { UserContriutionsList } from './components/user-contriutions-list';
import { UserRepositoriesList } from './components/user-repositories-list';
import { fetchProfileData } from '../../../../graphql/helpers/fetch-profile-data';
import { LayoutLeftColumn } from '../components/layout-left-column';
import { buildProfileTabSEO } from '../seo';

export async function generateMetadata({ params }: { params: Promise<{ login: string }> }): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfileSeo(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('repositories', user);
}

export default async function ProfileRepositories({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  const { repositoriesCount, repositories, contributions } = await fetchProfileRepositories(login);

  return (
    <LayoutLeftColumn user={user}>
      <>
        <UserRepositoriesList repositories={repositories} login={login} repositoriesCount={repositoriesCount} />
        <UserContriutionsList contributions={contributions} login={login} />
      </>
    </LayoutLeftColumn>
  );
}
