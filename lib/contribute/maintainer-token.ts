import 'server-only';

import { cookies } from 'next/headers';
import type { JWT } from 'next-auth/jwt';

import { MAINTAINERS_PATH } from './contribute-path';
import { currentSessionToken } from './session-token';

/**
 * The maintainers page lists a visitor's repositories with the GitHub token of their light sign-in, which the site
 * otherwise never keeps. The page's sign-in button leaves a mark holding a random nonce, and sends the sign-in back to
 * the page with that nonce in its address. The sign-in's callback keeps the token only when both agree, so a mark left
 * by a sign-in abandoned at GitHub is never applied to another one. The token then stays in the session for
 * `MAINTAINER_TOKEN_TTL_MS`: an encrypted cookie only the server opens, never put in what the browser is given (the
 * `session` callback, `lib/auth-callbacks.ts`).
 */
const SIGN_IN_COOKIE = 'gitranks-maintainer-sign-in';

/** Long enough to go through GitHub's consent screen. */
const SIGN_IN_WINDOW_SEC = 5 * 60;

/** The query parameter that carries the nonce back to the page. */
const NONCE_PARAM = 's';
const NONCE = /^[0-9a-f-]{36}$/;

/** Where Auth.js keeps the address a sign-in returns to, over HTTPS and in local development. */
const CALLBACK_URL_COOKIES = ['__Secure-authjs.callback-url', 'authjs.callback-url'];

/** How long the token stays in the session after the sign-in. */
export const MAINTAINER_TOKEN_TTL_MS = 60 * 60 * 1000;

/** The mark's cookie: `__Host-` in production (Secure, the whole site, no domain), plain in local development. */
export function maintainerSignInCookie(secure = process.env.NODE_ENV === 'production') {
  return {
    name: secure ? `__Host-${SIGN_IN_COOKIE}` : SIGN_IN_COOKIE,
    options: { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' },
  };
}

/** Marks the sign-in about to start as the maintainers page's own; answers where the sign-in must return to. */
export async function markMaintainerSignIn(): Promise<string> {
  const nonce = crypto.randomUUID();
  const { name, options } = maintainerSignInCookie();
  (await cookies()).set(name, nonce, { ...options, maxAge: SIGN_IN_WINDOW_SEC });
  return `${MAINTAINERS_PATH}?${new URLSearchParams({ [NONCE_PARAM]: nonce })}`;
}

/** Whether `callbackUrl` returns to the maintainers page with `nonce`. */
const returnsWithNonce = (callbackUrl: string | undefined, nonce: string) => {
  if (!callbackUrl) return false;
  try {
    const url = new URL(callbackUrl, 'https://gitranks.invalid');
    return url.pathname === MAINTAINERS_PATH && url.searchParams.get(NONCE_PARAM) === nonce;
  } catch {
    return false;
  }
};

/**
 * Whether the sign-in being completed is the one the maintainers page started: the mark's nonce, in the address the
 * sign-in returns to. Any mark is used up.
 */
export async function takeMaintainerSignIn(): Promise<boolean> {
  try {
    const jar = await cookies();
    const { name, options } = maintainerSignInCookie();
    const nonce = jar.get(name)?.value;
    if (nonce === undefined) return false;
    try {
      jar.set(name, '', { ...options, maxAge: 0 });
    } catch {
      // Not writable here; the mark runs out on its own.
    }
    if (!NONCE.test(nonce)) return false;
    const callbackUrl = CALLBACK_URL_COOKIES.map((cookie) => jar.get(cookie)?.value).find(Boolean);
    return returnsWithNonce(callbackUrl, nonce);
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
 * sign-in's GitHub token is added, to the session the visitor already had when it is the same GitHub account (a token
 * sign-in stays one), or else to `identity`.
 */
export async function lightSignInSession(
  identity: JWT,
  account: { access_token?: string; expires_at?: number },
): Promise<JWT> {
  if (!(await takeMaintainerSignIn())) return identity;
  const current = await currentSessionToken();
  // The session they had only when it is the same GitHub account; signing in as another switches to it.
  const sameAccount =
    !!current &&
    !current.error &&
    current.sub === identity.sub &&
    !!current.githubLogin &&
    current.githubLogin.toLowerCase() === identity.githubLogin?.toLowerCase();
  const kept = current && sameAccount ? current : identity;
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
