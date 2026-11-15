import { DailyUpdateReason } from '@/types/generated/graphql';
import { formatTimeLeft } from '@/utils/format-time-left';
import type { RefreshMode } from '@/utils/refresh-mode';

/**
 * A profile's or a repository's daily updates, as the page's data has them: why it updates every day and when next.
 * `null` or missing while it is not on daily updates.
 */
export type DailyUpdatesFacts = {
  reasons: readonly DailyUpdateReason[];
  nextUpdateAt?: string | null;
} | null;

/**
 * What the profile's Refresh button shows:
 * - `visitor-off`: today's button;
 * - `visitor-on-owner`, `visitor-on-badge`: the profile updates every day, turned on by its owner or kept on by a
 *   GitRanks badge on GitHub; a press explains why;
 * - `owner-off`, `owner-on`, `owner-manual-used`, `owner-on-badge-only`: the owner's own states, for their own
 *   profile.
 */
export type ProfileUpdatesView =
  | 'visitor-off'
  | 'visitor-on-owner'
  | 'visitor-on-badge'
  | 'owner-off'
  | 'owner-on'
  | 'owner-manual-used'
  | 'owner-on-badge-only';

/**
 * What the repository page shows under Refresh:
 * - `repo-off`: nothing new;
 * - `repo-your-pick`: the visitor's own pick;
 * - `repo-on-badge`: it updates every day, kept on by a GitRanks badge in its README;
 * - `repo-on-pick`: it updates every day, and nothing more: who picked it is never shown.
 */
export type RepoUpdatesView = 'repo-off' | 'repo-your-pick' | 'repo-on-badge' | 'repo-on-pick';

const has = (facts: DailyUpdatesFacts | undefined, reason: DailyUpdateReason) => !!facts?.reasons.includes(reason);

/**
 * The profile's state for this visitor. A visitor who may refresh the profile keeps today's button: the owner on
 * their own profile, and anyone signed in with their own token. While the session loads, the profile's own state is
 * shown, as most visitors are not its owner. When both reasons hold, the badge is named: it tells less about the
 * owner than their visits do.
 */
export function profileUpdatesViewOf(mode: RefreshMode, facts: DailyUpdatesFacts | undefined): ProfileUpdatesView {
  if (mode === 'daily' || mode === 'token') {
    return 'visitor-off';
  }

  if (has(facts, DailyUpdateReason.Badge)) {
    return 'visitor-on-badge';
  }

  return has(facts, DailyUpdateReason.Owner) ? 'visitor-on-owner' : 'visitor-off';
}

/** The repository's state for any visitor. When a badge and a pick both hold, the badge is named. */
export function repoUpdatesViewOf(facts: DailyUpdatesFacts | undefined): RepoUpdatesView {
  if (has(facts, DailyUpdateReason.Badge)) {
    return 'repo-on-badge';
  }

  return has(facts, DailyUpdateReason.Pick) ? 'repo-on-pick' : 'repo-off';
}

/**
 * "Next update in 5 h." from the next update's time and the browser's clock, so a cached page stays right; "Next
 * update soon." once it is due. `null` without a time.
 */
export function nextUpdateText(nextUpdateAt: string | null | undefined, now: number): string | null {
  const at = nextUpdateAt ? new Date(nextUpdateAt).getTime() : Number.NaN;

  if (Number.isNaN(at)) {
    return null;
  }

  return at > now ? `Next update in ${formatTimeLeft(at - now)}.` : 'Next update soon.';
}
