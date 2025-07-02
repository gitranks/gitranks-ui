import { unstable_cacheTag as cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileTimelineDocument } from '@/types/generated/graphql';

export const fetchProfileTimeline = async (login: string) => {
  'use cache';
  cacheTag(`profile:${login}`);

  const { user } = (await graphqlDirect(ProfileTimelineDocument, { login })) ?? {};

  if (!user) {
    return {};
  }

  return { timeline: user.timeline };
};
