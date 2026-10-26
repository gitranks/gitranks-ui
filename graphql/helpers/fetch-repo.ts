import { cacheLife, cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageRepoDocument } from '@/types/generated/graphql';
import { getRepoCacheTag } from '@/utils/repo-paths';

export const fetchRepo = async (owner: string, name: string) => {
  'use cache';
  cacheLife('hours');
  cacheTag(getRepoCacheTag(owner, name));

  const { repo } = (await graphqlDirect(PageRepoDocument, { owner, name })) ?? {};

  return repo ?? null;
};
