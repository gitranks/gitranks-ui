import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { BadgeTiersDocument } from '@/types/generated/graphql';

/** How many profiles each worldwide ranking holds, as counted by the weekly tier update. */
export const fetchGlobalRankedCounts = async () => {
  'use cache';
  cacheLife('days');

  const { rankTiersByName } =
    (await graphqlDirect(BadgeTiersDocument, {
      tiersName: 'global',
      includeSTiers: false,
      includeCTiers: false,
      includeFTiers: false,
    })) ?? {};

  return rankTiersByName ?? null;
};
