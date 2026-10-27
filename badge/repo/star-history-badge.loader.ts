import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { StarHistoryRepoDocument } from '@/types/generated/graphql';

export const fetchBadgeRepo = async (owner: string, name: string) => {
  const { repo } = await graphqlDirect(StarHistoryRepoDocument, { owner, name }, { source: 'badge' });
  return repo ?? null;
};
