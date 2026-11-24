import type { ContributeReplyDraft } from './contribute.types';
import { isNoReply } from './one-comment';

/**
 * Replies GitHub did not take, as the contribution's page says them: grouped by the run that drafted them, then by why.
 * A reason two or more replies of a run share is said once, at the run's scope (its move card, or one line under the
 * comments' Not posted group); a reason no other reply of the run has stays with its reply. Pure: the move card, the
 * comment rows and their specs read the same.
 */

/** A run's replies that did not post: all of them, the reasons shared by two or more, and the ones alone. */
export type RunTrouble = {
  /** The drafts' `attemptId`: the run that drafted them. */
  runId: string;
  /** Every failed draft of the run not in review. */
  failed: ContributeReplyDraft[];
  /** The reasons two or more of them share, the most frequent first. */
  shared: { reason: string; drafts: ContributeReplyDraft[] }[];
  /** The drafts whose reason no other draft of the run has. */
  alone: ContributeReplyDraft[];
};

/** Why a reply did not post, as one key: the API's reason trimmed and lowercased, `unknown` when it gave none. */
export const reasonKeyOf = (draft: Pick<ContributeReplyDraft, 'lastError'>): string =>
  draft.lastError?.reason?.trim().toLowerCase() || 'unknown';

/** GitHub, the organization or the missing access blocks it: an amber "Not posted", not a fault. */
export const BLOCK_REASONS: ReadonlySet<string> = new Set([
  'org_restricted',
  'forbidden',
  'grant_missing',
  'grant_revoked',
]);

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

const oldest = (drafts: ContributeReplyDraft[]) => Math.min(...drafts.map(({ updatedAt }) => timeOf(updatedAt)));

/**
 * The replies that did not post, per run: only `FAILED` drafts count, never one in a run's review (it is an editable
 * reply there) nor a thread the run found needs no reply. Runs and reasons with the oldest failure first among equals.
 */
export function replyTroubleOf(drafts: readonly ContributeReplyDraft[] | null | undefined): RunTrouble[] {
  const byRun = new Map<string, ContributeReplyDraft[]>();
  for (const draft of drafts ?? []) {
    if (draft.state !== 'FAILED' || isNoReply(draft) || ('inReview' in draft && draft.inReview === true)) continue;
    byRun.set(draft.attemptId, [...(byRun.get(draft.attemptId) ?? []), draft]);
  }
  return [...byRun.entries()]
    .sort(([, a], [, b]) => oldest(a) - oldest(b))
    .map(([runId, failed]) => {
      const byReason = new Map<string, ContributeReplyDraft[]>();
      for (const draft of failed)
        byReason.set(reasonKeyOf(draft), [...(byReason.get(reasonKeyOf(draft)) ?? []), draft]);
      const groups = [...byReason.entries()].map(([reason, list]) => ({ reason, drafts: list }));
      return {
        runId,
        failed,
        shared: groups
          .filter(({ drafts: list }) => list.length > 1)
          .sort((a, b) => b.drafts.length - a.drafts.length || oldest(a.drafts) - oldest(b.drafts)),
        alone: groups.filter(({ drafts: list }) => list.length === 1).flatMap(({ drafts: list }) => list),
      };
    });
}
