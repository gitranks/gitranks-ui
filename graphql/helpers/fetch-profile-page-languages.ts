import { cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageProfileLanguagesDocument } from '@/types/generated/graphql';
import { profileCacheTag } from '@/utils/profile-refresh';

export const fetchProfilePageLanguages = async (login: string, context: string = 'global') => {
  'use cache';
  cacheTag(profileCacheTag(login));

  const isGlobalContext = context === 'global';
  const { user } = (await graphqlDirect(PageProfileLanguagesDocument, { login, isGlobalContext })) ?? {};

  return user;
};
