import { parse } from 'graphql';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { sessionTokenOf } from '@/lib/workspace/session-token';
import type DocumentNode from '@/types/typed-document-node';

/** Whether Learn is open to the signed-in viewer. */
export const LearnOpenDocument = parse('query LearnOpen { learnOpen }') as DocumentNode<{ learnOpen: boolean }>;

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

/** The longest the proxy waits for `learnOpen`; no answer by then lets the request on to the page, which asks again. */
export const LEARN_ACCESS_TIMEOUT_MS = 2000;

export async function requestLearnAccess(
  req: { headers: Headers },
  timeoutMs = LEARN_ACCESS_TIMEOUT_MS,
): Promise<LearnAccess> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return 'signed-out';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), timeoutMs);
  });
  try {
    return (await Promise.race([learnOpenFor(token.githubLogin), late])) ? 'open' : 'closed';
  } finally {
    clearTimeout(timer);
  }
}
