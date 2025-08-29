import { FC } from 'react';

import { PageProfileRepositoriesQuery, Repository } from '@/types/generated/graphql';

import { LoadMoreRepositories } from './load-more-repositories';
import { RepositoryCard } from './repository-card';

type UserRepositoriesListProps = {
  repositories?: NonNullable<PageProfileRepositoriesQuery['user']>['repositories'] | null;
  login: string;
  repositoriesCount?: number | null;
  loadMore?: boolean;
};

export const UserRepositoriesList: FC<UserRepositoriesListProps> = ({
  login,
  repositories,
  repositoriesCount,
  loadMore,
}) => {
  if (!repositories?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {repositories?.map((repo) => (
        <RepositoryCard key={repo.name} repository={repo as Repository} login={login} />
      ))}
      {loadMore && <LoadMoreRepositories login={login} repositoriesCount={repositoriesCount} />}
    </div>
  );
};
