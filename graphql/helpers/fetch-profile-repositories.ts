import { unstable_cacheTag as cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileContributionsDocument, ProfileRepositoriesDocument } from '@/types/generated/graphql';

export const fetchProfileRepositories = async (login: string) => {
  'use cache';
  cacheTag(`profile:${login}`);

  const reposPromise = graphqlDirect(ProfileRepositoriesDocument, { login, limit: 10, offset: 0 });
  const contributionsPromise = graphqlDirect(ProfileContributionsDocument, { login });

  const [{ user: userWithRepos }, { user: userWithContributions }] = await Promise.all([
    reposPromise,
    contributionsPromise,
  ]);

  return {
    ...userWithRepos,
    ...userWithContributions,
  };
};
