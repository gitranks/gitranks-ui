import { unstable_cacheTag as cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileSeoDocument } from '@/types/generated/graphql';

export const fetchProfileSeo = async (login: string) => {
  'use cache';
  cacheTag(`profile:${login}`);

  const { user } = (await graphqlDirect(ProfileSeoDocument, { login })) ?? {};

  return user;
};
