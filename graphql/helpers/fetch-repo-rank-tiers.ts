import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoRankTiersDocument } from '@/types/generated/graphql';

/**
 * The global repository tier table, best bucket first (`null` until one is built). `ok: false` when it could not be
 * read: callers that cache longer shorten their own life, since an outer `cacheLife` wins over this one.
 */
export const fetchRepoRankTiers = async () => {
  'use cache';

  try {
    const { repoRankTiers } = (await graphqlDirect(RepoRankTiersDocument, {})) ?? {};
    // Minutes, not hours: a new ranking replaces the table, and a page rendered after it needs the new cut-offs.
    cacheLife('minutes');
    return { tiers: repoRankTiers ?? null, ok: true };
  } catch {
    cacheLife('minutes');
    return { tiers: null, ok: false };
  }
};
