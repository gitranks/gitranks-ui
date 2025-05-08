import { cache } from 'react';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { UserDocument } from '@/types/generated/graphql';

export const fetchProfileData = cache(async (login: string) => {
  // Set the revalidation to 3 seconds to prevent multiple fetches caused by tab prefetching
  const { user } = (await graphqlDirect(UserDocument, { login }, { revalidate: 3 })) ?? {};

  if (!user) {
    return {};
  }

  return { user };
});
