import 'server-only';

import { signedFetch } from '@/lib/signed-fetch';

/**
 * Tells GitRanks a repository's Contribute badge was drawn. A hit only asks for a look at the repository's README,
 * where the badge has to be found; it proves nothing by itself. Never throws: a failed call costs nothing.
 */
export async function reportContributeBadgeSeen(repoId: string): Promise<void> {
  try {
    await signedFetch(
      '/ui/contribute-badge-seen',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoId }) },
      'badge',
    );
  } catch {
    // Ignored: the image is already on its way, and the next hit asks again.
  }
}
