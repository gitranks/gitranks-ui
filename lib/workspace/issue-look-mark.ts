import 'server-only';

import { cookies } from 'next/headers';

/**
 * A visitor's press of "See the full issue" travels through the GitHub sign-in in the page's address (`?look=1`), so
 * the issue is shown in full on return with no second press. An address alone could be sent to anyone signed in, and a
 * look counts toward their day, so the press also leaves this mark when the sign-in starts: the return makes the look
 * only when the mark names the same issue, and uses it up.
 */
const MARK_COOKIE = 'gitranks-issue-look';

/** Long enough to go through GitHub's consent screen. */
const MARK_WINDOW_SEC = 10 * 60;

/** The mark's cookie: `__Host-` in production (Secure, the whole site, no domain), plain in local development. */
export function issueLookMarkCookie(secure = process.env.NODE_ENV === 'production') {
  return {
    name: secure ? `__Host-${MARK_COOKIE}` : MARK_COOKIE,
    options: { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' },
  };
}

/** Leaves the mark of a press about to go through the sign-in. */
export async function markIssueLook(maskId: string): Promise<void> {
  const { name, options } = issueLookMarkCookie();
  (await cookies()).set(name, maskId, { ...options, maxAge: MARK_WINDOW_SEC });
}

/** Whether the mark names this issue. Any mark is used up. */
export async function takeIssueLookMark(maskId: string): Promise<boolean> {
  const jar = await cookies();
  const { name, options } = issueLookMarkCookie();
  const mark = jar.get(name)?.value;
  if (mark === undefined) return false;
  jar.set(name, '', { ...options, maxAge: 0 });
  return mark === maskId;
}
