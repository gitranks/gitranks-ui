import { unstable_cacheTag as cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageProfileRepositoriesDocument } from '@/types/generated/graphql';

export const fetchProfilePageRepositories = async (login: string, context: string = 'global') => {
  'use cache';
  cacheTag(`profile:${login}`);

  const isGlobalContext = context === 'global';
  const { user } = (await graphqlDirect(PageProfileRepositoriesDocument, { login, isGlobalContext })) ?? {};

  return user;
};
