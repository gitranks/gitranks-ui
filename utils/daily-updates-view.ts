import type { DailyUpdatesViewer } from '@/types/daily-updates.types';
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
 * The signed-in visitor's own daily updates, read in the browser after the page loads: never in the cached page.
 * `null` until it is read, for a visitor who is not signed in, and when the read failed.
 */
export type ViewerFacts = Pick<DailyUpdatesViewer, 'open' | 'state' | 'manual' | 'picks'> | null;

/**
 * What the profile's Refresh button shows:
 * - `visitor-off`: today's button;
 * - `visitor-on-owner`, `visitor-on-badge`: the profile updates every day, turned on by its owner or kept on by a
 *   GitRanks badge on GitHub; a press explains why;
 * - the owner's own states, on their own profile once the API says daily updates are open to them:
 *   - `owner-off`: "Start daily updates";
 *   - `owner-on`: "Refresh now", today's manual refresh is unused;
 *   - `owner-manual-used`: on, and today's manual refresh is used;
 *   - `owner-on-badge-only`: on by their badge alone, with no daily updates of their own: no manual refresh.
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
 * - `repo-off`: not on daily updates; a visitor the API lets pick sees "Update daily";
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
 *
 * The owner's states need the viewer's own facts with `open`; until they are read, or when the API keeps daily
 * updates closed to them, the owner sees today's button.
 */
export function profileUpdatesViewOf(
  mode: RefreshMode,
  facts: DailyUpdatesFacts | undefined,
  viewer: ViewerFacts = null,
): ProfileUpdatesView {
  if (mode === 'daily' && viewer?.open) {
    if (viewer.state === 'on') {
      return viewer.manual.available ? 'owner-on' : 'owner-manual-used';
    }

    return has(facts, DailyUpdateReason.Badge) ? 'owner-on-badge-only' : 'owner-off';
  }

  if (mode === 'daily' || mode === 'token') {
    return 'visitor-off';
  }

  if (has(facts, DailyUpdateReason.Badge)) {
    return 'visitor-on-badge';
  }

  return has(facts, DailyUpdateReason.Owner) ? 'visitor-on-owner' : 'visitor-off';
}

/** Whether the viewer picked this repository; GitHub's names are not case-sensitive. */
export const isViewerPick = (viewer: ViewerFacts, nameWithOwner: string) =>
  !!viewer?.open && viewer.picks.some((pick) => pick.nameWithOwner.toLowerCase() === nameWithOwner.toLowerCase());

/**
 * The repository's state for this visitor: their own pick first, then for anyone the badge, then a pick that names
 * nobody. When a badge and a pick both hold, the badge is named.
 */
export function repoUpdatesViewOf(
  facts: DailyUpdatesFacts | undefined,
  viewer: ViewerFacts = null,
  nameWithOwner = '',
): RepoUpdatesView {
  if (isViewerPick(viewer, nameWithOwner)) {
    return 'repo-your-pick';
  }

  if (has(facts, DailyUpdateReason.Badge)) {
    return 'repo-on-badge';
  }

  return has(facts, DailyUpdateReason.Pick) ? 'repo-on-pick' : 'repo-off';
}

/** Whether the repository page offers "Update daily": open to the visitor, and not on daily updates yet. */
export const canPickRepo = (view: RepoUpdatesView, viewer: ViewerFacts) => view === 'repo-off' && !!viewer?.open;

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
