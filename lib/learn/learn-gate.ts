import { LearnOpenDocument } from './learn.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * Whether GitRanks Learn is open to this GitHub login (the API's `learnOpen`). Closed without a login, and on any
 * failure: an API that does not know the field yet answers a schema error, and Learn stays closed until it does.
 */
export async function learnOpenFor(githubLogin: string | null | undefined): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { learnOpen } = await graphqlDirect(LearnOpenDocument, undefined, { source: 'ssr', githubLogin });
    return learnOpen === true;
  } catch {
    return false;
  }
}
