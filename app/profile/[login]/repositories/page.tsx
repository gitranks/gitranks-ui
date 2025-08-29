'use cache';

import { Metadata } from 'next';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { fetchProfilePageRepositories } from '@/graphql/helpers/fetch-profile-page-repositories';
import { fetchProfileSeo } from '@/graphql/helpers/fetch-profile-seo';

import { UserContributionsList } from './components/user-contriutions-list';
import { UserRepositoriesList } from './components/user-repositories-list';
import { LayoutLeftColumn } from '../components/layout-left-column';
import NotFound from '../not-found';
import { buildProfileTabSEO } from '../seo';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/repositories'>): Promise<Metadata> {
  const { login } = await params;
  const user = await fetchProfileSeo(login);

  if (!user) {
    return {};
  }

  return buildProfileTabSEO('repositories', user);
}

export default async function ProfileRepositories({ params }: PageProps<'/profile/[login]/repositories'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const user = await fetchProfilePageRepositories(login);

  if (!user) {
    notFound();
  }

  if (user.fetchingStatus === 'FETCHING' && !user.avatarUrl) {
    // user is being fetched for the first time
    return <NotFound fetchingStatus={user.fetchingStatus} fetchingUpdatedAt={user.fetchingUpdatedAt} />;
  }

  const { repositoriesCount, repositories, contributions } = user;

  return (
    <LayoutLeftColumn user={user}>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Repositories</h2>
          <UserRepositoriesList
            repositories={repositories}
            login={login}
            repositoriesCount={repositoriesCount}
            loadMore
          />
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Contributions</h2>
          <UserContributionsList contributions={contributions} login={login} loadMore />
        </div>
      </div>
    </LayoutLeftColumn>
  );
}
