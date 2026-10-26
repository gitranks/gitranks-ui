import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { BadgeRepoDocument } from '@/types/generated/graphql';

export const fetchBadgeRepo = async (owner: string, name: string) => {
  const { repo } = await graphqlDirect(BadgeRepoDocument, { owner, name }, { source: 'badge' });
  return repo ?? null;
};
