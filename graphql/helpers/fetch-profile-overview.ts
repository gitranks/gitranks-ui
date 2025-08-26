import { unstable_cacheTag as cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileOverviewDocument } from '@/types/generated/graphql';

export const fetchProfileOverview = async (login: string) => {
  'use cache';
  cacheTag(`profile:${login}`);

  const { user } = (await graphqlDirect(ProfileOverviewDocument, { login })) ?? {};

  return user;
};
