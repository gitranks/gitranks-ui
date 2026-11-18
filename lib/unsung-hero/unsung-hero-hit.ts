import 'server-only';

import type { HeroHit } from './unsung-hero';
import { signedFetch } from '@/lib/signed-fetch';

/** Who a hit is from, read by the route on the server: the signed-in viewer, if any, and the network address. */
export type HeroHitCaller = { githubLogin?: string; accountEmail?: string; visitorAddress?: string };

/** The longest a hit waits for the API: a count is never worth keeping the browser's request open. */
const TIMEOUT_MS = 5_000;

/**
 * Passes one hit on to the API, which counts it once per visitor a day, and only for this week's hero. The address goes
 * along only to tell visitors apart and is not kept. Never throws: a count lost is not worth an error.
 */
export async function sendHeroHit(caller: HeroHitCaller, hit: HeroHit): Promise<void> {
  try {
    const response = await signedFetch(
      '/unsung-hero/hit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: hit.kind,
          repo: hit.repo,
          ...(caller.visitorAddress ? { visitorAddress: caller.visitorAddress } : {}),
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      'client',
      caller.githubLogin,
      caller.accountEmail,
    );
    void response.body?.cancel().catch(() => undefined);
  } catch {
    // Not counted: the page has moved on.
  }
}
