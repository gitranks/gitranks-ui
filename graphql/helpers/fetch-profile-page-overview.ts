import { cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageProfileOverviewDocument } from '@/types/generated/graphql';

export const fetchProfilePageOverview = async (login: string, context: string = 'global') => {
  'use cache';
  cacheTag(`profile:${login}`);

  const isGlobalContext = context === 'global';
  const { user } = (await graphqlDirect(PageProfileOverviewDocument, { login, isGlobalContext })) ?? {};

  return user;
};
