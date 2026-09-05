'use server';

import jwt from 'jsonwebtoken';

import { auth } from '@/auth';

/** Which surface issued the call, so the API can bucket traffic. Defaults to page renders. */
export type RequestSource = 'ssr' | 'client' | 'badge';

type InternalClaims = {
  source: RequestSource | 'build';
  githubLogin?: string;
};

const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

/** Sent during `next build` only; see internal deployment notes. */
const CF_BUILD_BYPASS_HEADER = 'x-gitranks-build';

const resolveClaims = async (source: RequestSource): Promise<InternalClaims> => {
  if (isBuildPhase()) {
    return { source: 'build' };
  }

  const claims: InternalClaims = { source };

  // Throws outside a request scope (e.g. inside "use cache"), which is expected for ssr renders.
  try {
    const session = await auth();
    if (session?.user?.githubLogin && !session.error) claims.githubLogin = session.user.githubLogin;
  } catch {
    // no request scope
  }

  return claims;
};

export async function signedFetch(path: string, init: RequestInit = {}, source: RequestSource = 'ssr') {
  const claims = await resolveClaims(source);
  const token = jwt.sign(claims, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '5m' });

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (isBuildPhase() && process.env.CF_BUILD_BYPASS_TOKEN) {
    headers.set(CF_BUILD_BYPASS_HEADER, process.env.CF_BUILD_BYPASS_TOKEN);
  }

  return fetch(`${process.env.URI_GITRANKS!}${path}`, { ...init, headers });
}
