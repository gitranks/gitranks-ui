import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { BadgeTiersDocument } from '@/types/generated/graphql';

/** How many profiles each ranking holds, worldwide (`global`) or in one country. Shared by every profile. */
export const fetchRankedCounts = async (tiersName: string) => {
  'use cache';
  cacheLife('hours');

  const { rankTiersByName } =
    (await graphqlDirect(BadgeTiersDocument, {
      tiersName,
      includeSTiers: false,
      includeCTiers: false,
      includeFTiers: false,
    })) ?? {};

  if (!rankTiersByName) {
    return null;
  }

  const { sUsers, cUsers, fUsers } = rankTiersByName;

  return { sUsers, cUsers, fUsers };
};
