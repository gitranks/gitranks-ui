import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoRankTiersDocument } from '@/types/generated/graphql';

/** The global repository tier table, best bucket first; `null` until one is built or when it cannot be read. */
export const fetchRepoRankTiers = async () => {
  'use cache';

  try {
    const { repoRankTiers } = (await graphqlDirect(RepoRankTiersDocument, {})) ?? {};
    cacheLife('hours');
    return repoRankTiers ?? null;
  } catch {
    cacheLife('minutes');
    return null;
  }
};
