import 'server-only';

import { cookies } from 'next/headers';

import { learnOpenToEveryone } from './learn-everyone';

/** A session cookie: `__Secure-` over HTTPS, bare in local dev; `.0`, `.1`… when the JWT is split (as the proxy reads it). */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?$/;

/**
 * Whether the front door shows its visitor version to a request with no signed-in viewer. Without a session cookie the
 * proxy has already decided (it lets such a visitor through to `/learn` only when Learn is open to everyone), and the
 * page trusts it: the proxy and the page keep separate answers, and a second, newer one here would turn the proxy's
 * pass into a 404 streamed after a 200. A session cookie that signs nobody in (an expired one) passed the proxy
 * unasked, so it is asked here.
 */
export async function learnFrontDoorOpenToVisitor(): Promise<boolean> {
  const jar = await cookies();
  if (!jar.getAll().some(({ name }) => SESSION_COOKIE.test(name))) return true;
  return learnOpenToEveryone();
}
