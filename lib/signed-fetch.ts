import 'server-only';

import jwt from 'jsonwebtoken';

/** Which surface issued the call, so the API can bucket traffic. Defaults to page renders. */
export type RequestSource = 'ssr' | 'client' | 'badge';

type InternalClaims = {
  source: RequestSource | 'build';
  githubLogin?: string;
};

const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

/** Sent during `next build` only; see internal deployment notes. */
const CF_BUILD_BYPASS_HEADER = 'x-gitranks-build';

/**
 * `githubLogin` is always supplied by the caller, never read from the session here.
 * Resolving it internally would mean calling `auth()` — and therefore `headers()` —
 * on paths that run inside a "use cache" scope, which `cacheComponents` rejects.
 * Callers that have a request scope read the session there and pass it down.
 */
const resolveClaims = (source: RequestSource, githubLogin?: string): InternalClaims => {
  if (isBuildPhase()) {
    return { source: 'build' };
  }

  return githubLogin ? { source, githubLogin } : { source };
};

export async function signedFetch(
  path: string,
  init: RequestInit = {},
  source: RequestSource = 'ssr',
  githubLogin?: string,
) {
  const claims = resolveClaims(source, githubLogin);
  const token = jwt.sign(claims, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '5m' });

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (isBuildPhase() && process.env.CF_BUILD_BYPASS_TOKEN) {
    headers.set(CF_BUILD_BYPASS_HEADER, process.env.CF_BUILD_BYPASS_TOKEN);
  }

  return fetch(`${process.env.URI_GITRANKS!}${path}`, { ...init, headers });
}
