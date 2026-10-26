import type { AuthMode } from '@/lib/auth-providers';
import type { RepoPullState } from '@/types/repo-pull.types';
import { PROFILE_REFRESH_WINDOW } from '@/utils/profile-refresh';

/** A token sign-in fetches on the visitor's own access; any other uses the free fetch of the day. */
export const repoPullPath = (authMode: AuthMode | undefined) =>
  authMode === 'token' ? '/repo/pull/token' : '/repo/pull/daily';

/** The finished fetch as one key, or null when no fetch finished lately and nothing in the cache is stale. */
export function recentPullState(pull: RepoPullState | null | undefined, now: number): string | null {
  if (!pull?.finishedAt || pull.status === 'running') {
    return null;
  }

  const finishedAt = new Date(pull.finishedAt).getTime();
  if (!Number.isFinite(finishedAt) || now - finishedAt > PROFILE_REFRESH_WINDOW) {
    return null;
  }

  return `${pull.status}@${pull.finishedAt}`;
}
