import 'server-only';

import { signedFetch } from '@/lib/signed-fetch';

/** What a reported badge shows: a developer's numbers or a repository's. */
export type BadgeSeenKind = 'user' | 'repo';

/**
 * Tells the API a badge of this entity was fetched for a README on GitHub. A hit only asks the API to look at the
 * entity's own README, where the badge has to be found; it proves nothing by itself. Never throws: a failed call
 * costs nothing.
 */
export async function reportBadgeSeen(kind: BadgeSeenKind, name: string): Promise<void> {
  try {
    await signedFetch(
      '/ui/badge-seen',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, name }) },
      'badge',
    );
  } catch {
    // Ignored: the image is already on its way, and the next hit asks again.
  }
}
