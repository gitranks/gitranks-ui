import { unstable_cacheTag as cacheTag } from 'next/cache';
import { cache } from 'react';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileSummaryDocument } from '@/types/generated/graphql';

export const fetchProfileData = cache(async (login: string) => {
  'use cache';
  cacheTag(`profile:${login}`);

  const { user } = (await graphqlDirect(ProfileSummaryDocument, { login })) ?? {};

  if (!user) {
    return {};
  }

  return { user };
});
