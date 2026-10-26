import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoRankingsDocument, type RepoRankingsQueryVariables } from '@/types/generated/graphql';

export const fetchRepoRankings = async (props: RepoRankingsQueryVariables) => {
  'use cache';
  cacheLife('hours');

  const { repoRankings } = (await graphqlDirect(RepoRankingsDocument, props)) ?? {};

  return repoRankings ?? [];
};
