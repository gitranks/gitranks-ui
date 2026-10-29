import 'server-only';

import { cookies } from 'next/headers';
import type { JWT } from 'next-auth/jwt';

import { currentSessionToken } from './session-token';

/**
 * The maintainers page lists a visitor's repositories with the GitHub token of their light sign-in, which the site
 * otherwise never keeps. The page's sign-in button leaves this mark; the sign-in's callback reads it and keeps that
 * one token in the session, for `MAINTAINER_TOKEN_TTL_MS`. The session is an encrypted cookie only the server opens,
 * and the token is never put in what the browser is given (`session` in `auth.ts`).
 */
export const MAINTAINER_SIGN_IN_COOKIE = 'gitranks-maintainer-sign-in';

/** Long enough to go through GitHub's consent screen. */
const SIGN_IN_WINDOW_SEC = 10 * 60;

/** How long the token stays in the session after the sign-in. */
export const MAINTAINER_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Marks the sign-in about to start as the maintainers page's own. */
export async function markMaintainerSignIn(): Promise<void> {
  (await cookies()).set(MAINTAINER_SIGN_IN_COOKIE, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SIGN_IN_WINDOW_SEC,
  });
}

/** Whether the sign-in being completed was started on the maintainers page; the mark is used up. */
export async function takeMaintainerSignIn(): Promise<boolean> {
  try {
    const jar = await cookies();
    const marked = jar.get(MAINTAINER_SIGN_IN_COOKIE)?.value === '1';
    if (marked) {
      try {
        jar.delete(MAINTAINER_SIGN_IN_COOKIE);
      } catch {
        // Not writable here; the mark runs out on its own.
      }
    }
    return marked;
  } catch {
    return false;
  }
}

/**
 * `token` with the sign-in's GitHub token added, until the sooner of `MAINTAINER_TOKEN_TTL_MS` from now and when
 * GitHub says it expires; `token` as it was when GitHub gave none.
 */
export function withMaintainerToken(
  token: JWT,
  accessToken: string | undefined,
  expiresAtSec: number | undefined,
  now = Date.now(),
): JWT {
  if (typeof accessToken !== 'string' || !accessToken) return token;
  const ttlEnd = now + MAINTAINER_TOKEN_TTL_MS;
  const githubEnd = typeof expiresAtSec === 'number' && expiresAtSec > 0 ? expiresAtSec * 1000 : ttlEnd;
  return { ...token, maintainerToken: accessToken, maintainerTokenExpiresAt: Math.min(ttlEnd, githubEnd) };
}

/** Drops the maintainers page's token from `token` once it has run out. */
export function dropExpiredMaintainerToken(token: JWT, now = Date.now()): void {
  if (token.maintainerToken === undefined && token.maintainerTokenExpiresAt === undefined) return;
  if (maintainerTokenOf(token, now)) return;
  delete token.maintainerToken;
  delete token.maintainerTokenExpiresAt;
}

/**
 * The session a light sign-in starts: `identity`, without any token, unless the maintainers page started it. Then the
 * sign-in's GitHub token is added, to the session the visitor already had when it is the same user's (a token sign-in
 * stays one), or else to `identity`.
 */
export async function lightSignInSession(
  identity: JWT,
  account: { access_token?: string; expires_at?: number },
): Promise<JWT> {
  if (!(await takeMaintainerSignIn())) return identity;
  const current = await currentSessionToken();
  const kept = current && !current.error && current.sub === identity.sub ? current : identity;
  return withMaintainerToken(kept, account.access_token, account.expires_at);
}

/** The maintainers page's GitHub token in a session; null without one, or once it has run out. */
export function maintainerTokenOf(token: JWT | null | undefined, now = Date.now()): string | null {
  const value = token?.maintainerToken;
  const expiresAt = token?.maintainerTokenExpiresAt;
  if (typeof value !== 'string' || !value || typeof expiresAt !== 'number') return null;
  return now < expiresAt ? value : null;
}

/** The current request's maintainers page token, for the page and its actions; never sent to the browser. */
export async function currentMaintainerToken(): Promise<string | null> {
  return maintainerTokenOf(await currentSessionToken());
}
