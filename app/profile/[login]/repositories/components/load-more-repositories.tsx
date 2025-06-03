'use client';

import { FC, useState } from 'react';

import { Button } from '@/components/ui/button';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { Repository, ProfileRepositoriesDocument } from '@/types/generated/graphql';

import { RepositoryCard } from './repository-card';

const LAODED_BY_DEFAULT = 10;

type LoadMoreRepositoriesProps = {
  repositoriesCount?: number | null;
  login: string;
};

enum LoadingState {
  INITIAL = 'initial',
  LOADING = 'loading',
  LOADED = 'loaded',
}

export const LoadMoreRepositories: FC<LoadMoreRepositoriesProps> = ({ login, repositoriesCount }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.INITIAL);
  const [repositories, setRepositories] = useState<Repository[]>([]);

  const handleLoadMore = async () => {
    setLoadingState(LoadingState.LOADING);

    try {
      const { user } = (await graphqlClient(ProfileRepositoriesDocument, { login })) ?? {};

      setRepositories(user?.repositories ?? []);
      setLoadingState(LoadingState.LOADED);
    } catch (error) {
      console.error('Error loading more repositories:', error);
      setLoadingState(LoadingState.INITIAL);
    }
  };

  if (!repositoriesCount || repositoriesCount <= LAODED_BY_DEFAULT) {
    return null;
  }

  if (loadingState === LoadingState.INITIAL || loadingState === LoadingState.LOADING) {
    return (
      <Button
        disabled={loadingState === LoadingState.LOADING}
        onClick={handleLoadMore}
        variant="outline"
        className="flex-grow-0 self-start"
      >
        {loadingState === LoadingState.LOADING
          ? 'Loading...'
          : `Load all remaining ${repositoriesCount - LAODED_BY_DEFAULT} repositories`}
      </Button>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-wrap gap-6">
      {repositories?.map((repo) => (
        <RepositoryCard key={repo.githubId} repository={repo} login={login} />
      ))}
    </div>
  );
};
