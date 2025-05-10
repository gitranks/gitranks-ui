import { FC } from 'react';

import { Repository } from '@/types/generated/graphql';

import { LoadMoreRepositories } from './load-more-repositories';
import { RepositoryCard } from './repository-card';

type UserRepositoriesListProps = {
  repositories: Repository[] | null | undefined;
  login: string;
  repositoriesCount: number | null | undefined;
};

export const UserRepositoriesList: FC<UserRepositoriesListProps> = ({ login, repositories, repositoriesCount }) => {
  if (!repositories?.length) {
    return null;
  }

  return (
    <>
      <h2 className="text-xl font-semibold">Repositories</h2>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row flex-wrap gap-4 md:gap-6">
          {repositories?.map((repo) => (
            <RepositoryCard key={repo.githubId} repository={repo} login={login} />
          ))}
        </div>
        <LoadMoreRepositories login={login} repositoriesCount={repositoriesCount} />
      </div>
    </>
  );
};
