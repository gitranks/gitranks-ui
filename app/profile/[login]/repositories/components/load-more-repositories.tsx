'use client';

import { FC, useState } from 'react';

import { Button } from '@/components/ui/button';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { Repository, ProfileRepositoriesDocument } from '@/types/generated/graphql';

import { RepositoryCard } from './repository-card';

const LOADED_BY_DEFAULT = 10;
const CHUNK_SIZE = 20;

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

  const loadedCount = repositories.length + LOADED_BY_DEFAULT;

  const handleLoadMore = async () => {
    setLoadingState(LoadingState.LOADING);

    try {
      const { user } =
        (await graphqlClient(ProfileRepositoriesDocument, { login, limit: CHUNK_SIZE, offset: loadedCount })) ?? {};
      const newRepositories = (user?.repositories ?? []) as Repository[];

      setRepositories((prev) => [...prev, ...newRepositories]);
      setLoadingState(LoadingState.LOADED);
    } catch (error) {
      console.error('Error loading more repositories:', error);
      setLoadingState(LoadingState.INITIAL);
    }
  };

  const hasLoadMoreButton = !!repositoriesCount && repositoriesCount > loadedCount;

  return (
    <>
      {repositories?.map((repo) => (
        <RepositoryCard key={repo.githubId} repository={repo} login={login} />
      ))}

      {hasLoadMoreButton && (
        <Button
          disabled={loadingState === LoadingState.LOADING}
          onClick={handleLoadMore}
          variant="outline"
          className="flex-grow-0 self-start"
        >
          {loadingState === LoadingState.LOADING
            ? 'Loading...'
            : `Show more - ${loadedCount} of ${repositoriesCount} shown`}
        </Button>
      )}
    </>
  );
};
