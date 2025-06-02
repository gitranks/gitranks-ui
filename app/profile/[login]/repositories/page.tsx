'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { fetchProfileData } from '../utils/fetch-profile-data';
import { UserContriutionsList } from './components/user-contriutions-list';
import { UserRepositoriesList } from './components/user-repositories-list';

export default async function ProfileRepositories({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  const { repositories, contributions, repositoriesCount } = user;

  return (
    <LayoutLeftColumn user={user}>
      <div className="flex flex-col gap-4">
        <UserRepositoriesList repositories={repositories} login={login} repositoriesCount={repositoriesCount} />
        <UserContriutionsList contributions={contributions} login={login} />
      </div>
    </LayoutLeftColumn>
  );
}
