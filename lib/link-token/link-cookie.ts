import 'server-only';

import { cookies } from 'next/headers';

import { isLinkToken, LINK_COOKIE_MAX_AGE_SEC, type LinkKind, linkCookie } from './link-token';

/** The token a link left for this kind's page; null without one, or once it ran out. Never logged. */
export async function readLinkToken(kind: LinkKind): Promise<string | null> {
  const value = (await cookies()).get(linkCookie(kind).name)?.value;
  return isLinkToken(value) ? value : null;
}

/** Keeps `token` for this kind's page for another `LINK_COOKIE_MAX_AGE_SEC`. Server actions only. */
export async function keepLinkToken(kind: LinkKind, token: string): Promise<void> {
  if (!isLinkToken(token)) return;
  const { name, options } = linkCookie(kind);
  (await cookies()).set(name, token, { ...options, maxAge: LINK_COOKIE_MAX_AGE_SEC });
}
