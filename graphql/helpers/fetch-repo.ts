import { cacheLife, cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageRepoDocument } from '@/types/generated/graphql';
import { getRepoCacheTag } from '@/utils/repo-paths';

export const fetchRepo = async (owner: string, name: string) => {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));

  const { repo } = (await graphqlDirect(PageRepoDocument, { owner, name })) ?? {};
  // A running fetch ends on its own, so a result that shows one is kept only briefly.
  if (repo?.pull?.status === 'running') {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  return repo ?? null;
};
