import 'server-only';

import { InterviewsOpenDocument } from './interviews.documents';
import { interviewsOpenToEveryone } from './interviews-everyone';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { sessionTokenOf } from '@/lib/workspace/session-token';

/** The longest the proxy waits for whether Interviews is open to the signed-in person; no answer by then is closed. */
export const INTERVIEWS_OPEN_TIMEOUT_MS = 1_500;

/**
 * Whether GitRanks Interviews is open to this GitHub login (the API's `interviewsOpen`): true only for a real `true`. Closed
 * without a login and on any failure, an API that does not know the field yet included, and nothing is logged.
 */
export async function interviewsOpenFor(
  githubLogin: string | null | undefined,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { interviewsOpen } = await graphqlDirect(InterviewsOpenDocument, undefined, {
      source: 'ssr',
      githubLogin,
      ...(signal ? { signal } : {}),
    });
    return interviewsOpen === true;
  } catch {
    return false;
  }
}

/** `interviewsOpenFor` within `timeoutMs`: a slow answer is closed, and the ask stops. */
export async function interviewsOpenWithin(
  githubLogin: string,
  timeoutMs = INTERVIEWS_OPEN_TIMEOUT_MS,
): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([interviewsOpenFor(githubLogin, controller.signal), late]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Interviews' gate, as the proxy asks it before any Interviews page renders:
 * - `everyone`: Interviews is open to everyone;
 * - `person`: Interviews is open to the request's signed-in person, and not yet to everyone (the page is not indexed);
 * - `closed`: anyone else, a visitor without a session and a session the server cannot read included.
 * It fails closed: an answer that is slow, missing or an error is `closed`. Only an Interviews address asks, so no other
 * page waits for it.
 */
export type InterviewsGate = 'everyone' | 'person' | 'closed';

export async function interviewsGateOf(
  request: { headers: Headers },
  now: number,
  timeoutMs = INTERVIEWS_OPEN_TIMEOUT_MS,
): Promise<InterviewsGate> {
  if (await interviewsOpenToEveryone(now)) return 'everyone';
  const token = await sessionTokenOf(request);
  if (!token?.githubLogin || token.error) return 'closed';
  return (await interviewsOpenWithin(token.githubLogin, timeoutMs)) ? 'person' : 'closed';
}
