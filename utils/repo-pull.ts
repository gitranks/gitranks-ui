import type { AuthMode } from '@/lib/auth-providers';
import type { RepoPullState } from '@/types/repo-pull.types';

/** How long after a fetch finished a status read may expire the cached page; it covers a slow fetch. */
export const PULL_EXPIRY_WINDOW = 2 * 60 * 60 * 1_000;

/** A token sign-in fetches on the visitor's own access; any other uses the free fetch of the day. */
export const repoPullPath = (authMode: AuthMode | undefined) =>
  authMode === 'token' ? '/repo/pull/token' : '/repo/pull/daily';

/** The finished fetch as one key, or null when no fetch finished lately and nothing in the cache is stale. */
export function recentPullState(pull: RepoPullState | null | undefined, now: number): string | null {
  if (!pull?.finishedAt || pull.status === 'running') {
    return null;
  }

  const finishedAt = new Date(pull.finishedAt).getTime();
  if (!Number.isFinite(finishedAt) || now - finishedAt > PULL_EXPIRY_WINDOW) {
    return null;
  }

  return `${pull.status}@${pull.finishedAt}`;
}
