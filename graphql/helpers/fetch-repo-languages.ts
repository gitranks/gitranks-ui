import { cacheLife } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { RepoLanguagesDocument } from '@/types/generated/graphql';

/** Every language with ranked repositories, the most repositories first; `language: null` is the no-language list. */
export const fetchRepoLanguages = async () => {
  'use cache';
  cacheLife('hours');

  const { repoLanguages } = (await graphqlDirect(RepoLanguagesDocument)) ?? {};

  return repoLanguages ?? [];
};
