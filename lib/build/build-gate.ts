import 'server-only';

import { BuildOpenDocument } from './build.documents';
import { buildOpenToEveryone } from './build-everyone';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { sessionTokenOf } from '@/lib/workspace/session-token';

/** The longest the proxy waits for whether Build is open to the signed-in person; no answer by then is closed. */
export const BUILD_OPEN_TIMEOUT_MS = 1_500;

/**
 * Whether GitRanks Build is open to this GitHub login (the API's `buildOpen`): true only for a real `true`. Closed
 * without a login and on any failure, an API that does not know the field yet included, and nothing is logged.
 */
export async function buildOpenFor(githubLogin: string | null | undefined, signal?: AbortSignal): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { buildOpen } = await graphqlDirect(BuildOpenDocument, undefined, {
      source: 'ssr',
      githubLogin,
      ...(signal ? { signal } : {}),
    });
    return buildOpen === true;
  } catch {
    return false;
  }
}

/** `buildOpenFor` within `timeoutMs`: a slow answer is closed, and the ask stops. */
export async function buildOpenWithin(githubLogin: string, timeoutMs = BUILD_OPEN_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    return await Promise.race([buildOpenFor(githubLogin, controller.signal), late]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Build's gate, as the proxy asks it before any Build page renders:
 * - `everyone`: Build is open to everyone;
 * - `person`: Build is open to the request's signed-in person, and not yet to everyone (the page is not indexed);
 * - `closed`: anyone else, a visitor without a session and a session the server cannot read included.
 * It fails closed: an answer that is slow, missing or an error is `closed`. Only a Build address asks, so no other
 * page waits for it.
 */
export type BuildGate = 'everyone' | 'person' | 'closed';

export async function buildGateOf(
  request: { headers: Headers },
  now: number,
  timeoutMs = BUILD_OPEN_TIMEOUT_MS,
): Promise<BuildGate> {
  if (await buildOpenToEveryone(now)) return 'everyone';
  const token = await sessionTokenOf(request);
  if (!token?.githubLogin || token.error) return 'closed';
  return (await buildOpenWithin(token.githubLogin, timeoutMs)) ? 'person' : 'closed';
}
