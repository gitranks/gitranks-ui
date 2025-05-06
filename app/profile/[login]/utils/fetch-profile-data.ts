import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { UserDocument } from '@/types/generated/graphql';

export const fetchProfileData = async (login: string) => {
  const { user } = (await graphqlDirect(UserDocument, { login })) ?? {};

  if (!user) {
    return {};
  }

  return { user };
};
