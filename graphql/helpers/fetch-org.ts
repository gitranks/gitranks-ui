import { cacheTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { PageOrgDocument } from '@/types/generated/graphql';

export const fetchOrg = async (login: string) => {
  'use cache';
  cacheTag(`org:${login}`);

  const { organization } = (await graphqlDirect(PageOrgDocument, { login })) ?? {};

  return organization;
};
