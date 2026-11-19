import { headers } from 'next/headers';
import { getToken, type JWT } from 'next-auth/jwt';

/** Over HTTPS Auth.js names the session cookie with the `__Secure-` prefix, and salts the token with that name. */
const SECURE_SESSION_COOKIE = /(?:^|;\s*)__Secure-authjs\.session-token(?:\.\d+)?=/;

/**
 * The session token a request carries, decoded; null without one. Read where `auth()` is not the right tool: in the
 * proxy, and while Auth.js handles the GitHub grant's callback, whose callbacks get a fresh token rather than the
 * session's.
 */
export async function sessionTokenOf(req: { headers: Headers }): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const secureCookie = SECURE_SESSION_COOKIE.test(req.headers.get('cookie') ?? '');
  try {
    return await getToken({ req, secret, secureCookie });
  } catch {
    return null;
  }
}

/** The current request's session token, for code running in a request scope. */
export async function currentSessionToken(): Promise<JWT | null> {
  return sessionTokenOf({ headers: await headers() });
}
