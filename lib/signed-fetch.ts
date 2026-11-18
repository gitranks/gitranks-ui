import 'server-only';

import jwt from 'jsonwebtoken';

/** Which surface issued the call, so the API can bucket traffic. Defaults to page renders. */
export type RequestSource = 'ssr' | 'client' | 'badge';

type InternalClaims = {
  source: RequestSource | 'build';
  githubLogin?: string;
  /** The signed-in person's email, sent beside `githubLogin` when the session holds a valid one. */
  accountEmail?: string;
  /** Set, and only ever `true`, when GitHub marked `accountEmail` verified at the session's sign-in. */
  accountEmailVerified?: true;
};

const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

/** Sent during `next build` only. */
const CF_BUILD_BYPASS_HEADER = 'x-gitranks-build';

/**
 * `githubLogin` is always supplied by the caller, never read from the session here.
 * Resolving it internally would mean calling `auth()` — and therefore `headers()` —
 * on paths that run inside a "use cache" scope, which `cacheComponents` rejects.
 * Callers that have a request scope read the session there and pass it down.
 */
const resolveClaims = (
  source: RequestSource,
  githubLogin?: string,
  accountEmail?: string,
  accountEmailVerified?: boolean,
): InternalClaims => {
  if (isBuildPhase()) {
    return { source: 'build' };
  }
  if (!githubLogin) return { source };
  if (!accountEmail) return { source, githubLogin };
  // The claim is left out, never sent false: the API takes the email as proof of the address only when it is there.
  return accountEmailVerified === true
    ? { source, githubLogin, accountEmail, accountEmailVerified: true }
    : { source, githubLogin, accountEmail };
};

export async function signedFetch(
  path: string,
  init: RequestInit = {},
  source: RequestSource = 'ssr',
  githubLogin?: string,
  accountEmail?: string,
  /** Whether GitHub marked `accountEmail` verified at the sign-in; only the routes that need it pass it. */
  accountEmailVerified?: boolean,
) {
  const claims = resolveClaims(source, githubLogin, accountEmail, accountEmailVerified);
  const token = jwt.sign(claims, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '5m' });

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (isBuildPhase() && process.env.CF_BUILD_BYPASS_TOKEN) {
    headers.set(CF_BUILD_BYPASS_HEADER, process.env.CF_BUILD_BYPASS_TOKEN);
  }

  return fetch(`${process.env.URI_GITRANKS!}${path}`, { ...init, headers });
}
