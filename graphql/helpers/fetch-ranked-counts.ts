import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { BadgeTiersDocument } from '@/types/generated/graphql';

/**
 * How many profiles each ranking holds, worldwide (`global`) or in one country. Shared by every profile.
 * An optional fact: a failed read gives `null` for a few minutes instead of failing the page, because an
 * error inside a cached function fails the page even when its caller catches it.
 */
export const fetchRankedCounts = async (tiersName: string) => {
  'use cache';

  try {
    const { rankTiersByName } =
      (await graphqlDirect(BadgeTiersDocument, {
        tiersName,
        includeSTiers: false,
        includeCTiers: false,
        includeFTiers: false,
      })) ?? {};

    cacheLife('hours');

    if (!rankTiersByName) {
      return null;
    }

    const { sUsers, cUsers, fUsers } = rankTiersByName;

    return { sUsers, cUsers, fUsers };
  } catch {
    cacheLife('minutes');
    return null;
  }
};
