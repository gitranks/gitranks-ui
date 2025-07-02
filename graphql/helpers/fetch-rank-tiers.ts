import { unstable_cacheLife as cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RankTiersByNameDocument } from '@/types/generated/graphql';

export const fetchRankTiers = async (name: string) => {
  'use cache';
  cacheLife('days');

  const { rankTiersByName } = (await graphqlDirect(RankTiersByNameDocument, { name })) ?? {};

  return { rankTiers: rankTiersByName };
};
