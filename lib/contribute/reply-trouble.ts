import type { ContributeReplyDraft } from './contribute.types';
import { clipped } from './needs-you';

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

/**
 * A retry can fix it: GitHub did not answer, a fault on our side, a reason not known, or GitHub access (once it is
 * allowed again).
 */
export const RETRY_REASONS: ReadonlySet<string> = new Set([
  'transient',
  'no_answer',
  'unknown',
  'error',
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
 * reply there). Runs and reasons with the oldest failure first among equals.
 */
export function replyTroubleOf(drafts: readonly ContributeReplyDraft[] | null | undefined): RunTrouble[] {
  const byRun = new Map<string, ContributeReplyDraft[]>();
  for (const draft of drafts ?? []) {
    if (draft.state !== 'FAILED' || ('inReview' in draft && draft.inReview === true)) continue;
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

/** A note's first sentence, clipped to a line. */
const firstSentenceOf = (note: string | null | undefined): string | null => {
  const text = note?.trim();
  if (!text) return null;
  const end = text.search(/[.!?](\s|$)/);
  return clipped(end >= 0 ? text.slice(0, end + 1) : text, 200);
};

/**
 * One line for a reason the replies of a run share (or one reply's own, `count` 1): why they did not post, in the words
 * the move card and the comments' list both say. `org` is the organization (the owner part of the repo's name),
 * `pushed` whether the run's commits went on the pull request, `note` the first draft's note from the API.
 */
export function replyTroubleLineOf(
  reason: string,
  count: number,
  org: string,
  pushed: boolean,
  note?: string | null,
): string {
  const many = count > 1;
  const them = many ? 'them' : 'it';
  switch (reason) {
    case 'org_restricted':
      return `${pushed ? 'Your fixes are on the pull request. ' : ''}${many ? 'The replies are not' : 'The reply is not'}: ${org} only lets apps it has approved post in review threads, and GitRanks isn't one of them yet.`;
    case 'forbidden':
      return `GitHub refused ${them}: the conversation is locked or closed to you.`;
    case 'grant_missing':
    case 'grant_revoked':
      return `GitRanks has no GitHub access to post ${them}. Allow GitHub access again, then try again.`;
    case 'not_found':
      return many
        ? 'The comments they answer, or the pull request, are no longer on GitHub.'
        : 'The comment it answers, or the pull request, is no longer on GitHub.';
    case 'not_ours':
      return many
        ? "GitHub refused them: they aren't on a pull request GitRanks opened for you."
        : "GitHub refused it: it isn't on a pull request GitRanks opened for you.";
    case 'invalid':
      return many
        ? 'GitHub refused them as invalid. Check their text first.'
        : 'GitHub refused it as invalid. Check its text first.';
    case 'no_answer':
    case 'transient':
      return `GitHub didn't answer when GitRanks posted ${them}.`;
    case 'error':
      return `Something went wrong on our side, not in your ${many ? 'replies' : 'reply'}. Try again.`;
    default:
      return firstSentenceOf(note) ?? `GitHub refused ${them}.`;
  }
}

/** The organization a repo belongs to, as the reply lines name it: the owner part of `owner/repo`. */
export const orgNameOf = (nameWithOwner: string | null | undefined): string =>
  nameWithOwner?.split('/')[0] || 'the organization';
