import { cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageProfileRanksDocument } from '@/types/generated/graphql';

export const fetchProfilePageRanks = async (login: string, context: string = 'global') => {
  'use cache';
  cacheTag(`profile:${login}`);

  const isGlobalContext = context === 'global';
  const { user } = (await graphqlDirect(PageProfileRanksDocument, { login, isGlobalContext })) ?? {};

  return user;
};
