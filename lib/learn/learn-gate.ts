import { LearnOpenDocument } from './learn.documents';
import { sessionTokenOf } from '@/lib/contribute/session-token';
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

/**
 * Learn for the request's signed-in viewer, as the proxy reads it before a page renders: `open`, `closed`, or
 * `signed-out` when the request carries no session the server can read (none, or an expired one).
 */
export type LearnAccess = 'open' | 'closed' | 'signed-out';

export async function requestLearnAccess(req: { headers: Headers }): Promise<LearnAccess> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return 'signed-out';
  return (await learnOpenFor(token.githubLogin)) ? 'open' : 'closed';
}
