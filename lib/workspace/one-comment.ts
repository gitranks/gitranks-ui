import type { RepliesPlanRead, ReplyPlanRow } from './contribute.documents';
import type { ContributeAttemptDetail, ContributeReplyBatch, ContributeReplyDraft } from './contribute.types';

/**
 * A run's thread replies posted together as one comment on the pull request (2026-11-14): what the page reads of the
 * plan (each reply's, and the run's), what the replies-not-posted card offers, and the run's approval line when its
 * first reply is tried in its thread first. GitHub keeps some replies out of their threads (an organization that only
 * lets apps it approved post there); one comment quotes and links each thread, then gives its reply. Pure.
 */

// Self-contained on purpose: Needs you reads this module, and the reply lines' modules read Needs you.

/** A note's first sentence, clipped to a line. */
export function firstSentenceOf(note: string | null | undefined): string {
  const text = note?.replace(/\s+/g, ' ').trim() ?? '';
  const end = text.search(/[.!?](\s|$)/);
  const sentence = end >= 0 ? text.slice(0, end + 1) : text;
  return sentence.length > 300 ? `${sentence.slice(0, 299).trimEnd()}…` : sentence;
}

const has = <T extends object>(row: T, key: keyof T) => row[key] !== undefined;

/** Each draft with its plan fields, matched by id; a field the read does not answer is left as it was. */
export function withReplyPlansOf<T extends { draftId: string }>(
  drafts: T[],
  rows: readonly ReplyPlanRow[] | null | undefined,
): T[] {
  if (!rows?.length) return drafts;
  const plans = new Map(rows.map(({ draftId, ...plan }) => [draftId, plan]));
  return drafts.map((draft) => {
    const plan = plans.get(draft.draftId);
    if (!plan) return draft;
    const known = Object.fromEntries(Object.entries(plan).filter(([, value]) => value !== undefined));
    return { ...draft, ...known };
  });
}

/** The run's replies plan over its detail; another attempt's read, or one the API does not answer, leaves it. */
export function withRepliesPlanOf(
  attempt: ContributeAttemptDetail,
  read: RepliesPlanRead | null | undefined,
): ContributeAttemptDetail {
  if (!read || read.attemptId !== attempt.attemptId) return attempt;
  return {
    ...attempt,
    ...(has(read, 'threadRepliesBlocked') ? { threadRepliesBlocked: read.threadRepliesBlocked ?? null } : {}),
    ...(typeof read.probeFirst === 'boolean' ? { probeFirst: read.probeFirst } : {}),
    ...(typeof read.oneCommentFirst === 'boolean' ? { oneCommentFirst: read.oneCommentFirst } : {}),
    ...(has(read, 'oneComment') ? { oneComment: read.oneComment ?? null } : {}),
    ...(Array.isArray(read.copyBodies) ? { copyBodies: read.copyBodies } : {}),
    ...(Array.isArray(read.replyBatches) ? { replyBatches: read.replyBatches } : {}),
    ...(attempt.replyDrafts && Array.isArray(read.replyDrafts)
      ? { replyDrafts: withReplyPlansOf(attempt.replyDrafts, read.replyDrafts) }
      : {}),
  };
}

/** Approved with the push and held until the run's first reply answers in its thread: not the user's move. */
export const waitsForProbe = (draft: Pick<ContributeReplyDraft, 'state' | 'waitsForProbe'>) =>
  draft.state === 'DRAFT' && draft.waitsForProbe === true;

/** Approved with the push, then given back because the run's first reply did not reach its thread. */
export const isHeldBack = (draft: Pick<ContributeReplyDraft, 'state' | 'heldBack'>) =>
  draft.state === 'DRAFT' && !!draft.heldBack;

/**
 * The run found the thread's last word asks nothing of the user: no reply was drafted. It is listed on the run with its
 * reason, and never approved, edited, posted or counted as waiting, whatever state it arrives in.
 */
export const isNoReply = (draft: Pick<ContributeReplyDraft, 'outcome' | 'dismissedReason'>) =>
  draft.outcome === 'NO_REPLY' || draft.dismissedReason === 'NO_REPLY';

/**
 * A draft the user still approves: neither held back (said as not posted), nor waiting for the first reply, nor one
 * the run found needs no reply.
 */
export const isToApprove = (
  draft: Pick<ContributeReplyDraft, 'state' | 'heldBack' | 'waitsForProbe' | 'outcome' | 'dismissedReason'>,
) => draft.state === 'DRAFT' && !isNoReply(draft) && !isHeldBack(draft) && !waitsForProbe(draft);

/** In one comment, or going in one. */
export const inOneComment = (draft: Pick<ContributeReplyDraft, 'postAs' | 'batchId'>) =>
  draft.postAs === 'ONE_COMMENT' || !!draft.batchId;

/** Reasons that need GitHub access first: "Try again" once it is connected. */
const GRANT_REASONS: ReadonlySet<string> = new Set(['grant_missing', 'grant_revoked']);
/** A comment failed for them: its replies are still worth copying (nothing says the words are wrong, or GitHub has it). */
const COPY_AFTER: ReadonlySet<string> = new Set([
  'org_restricted',
  'forbidden',
  'not_ours',
  'invalid',
  'grant_missing',
  'grant_revoked',
  'not_configured',
]);

/** What a failed comment offers: Try again (by its `retry`), GitHub access first, and its replies to copy. */
export type BatchOffer = { tryAgain: boolean; grantFirst: boolean; copy: boolean };

export function batchOfferOf(batch: Pick<ContributeReplyBatch, 'retry' | 'lastError'>): BatchOffer {
  const reason = batch.lastError?.reason?.trim().toLowerCase() ?? '';
  const tryAgain = batch.retry === 'RESEND' || batch.retry === 'REBUILD';
  return {
    tryAgain,
    grantFirst: tryAgain && GRANT_REASONS.has(reason),
    // A comment GitHub may have posted already is sent again exactly, never copied by hand.
    copy: batch.retry !== 'RESEND' && COPY_AFTER.has(reason),
  };
}

/** A failed comment the run's page serves, with its replies still failed in it. */
export type FailedBatch = {
  batch: ContributeReplyBatch;
  drafts: ContributeReplyDraft[];
  offer: BatchOffer;
  /** Its note's first sentence, said on the card; the rest goes behind Why. */
  lead: string;
  rest: string | null;
};

/** The replies-not-posted card's model: what one click posts, what Copy all copies, the failed comments. */
export type OneCommentCard = {
  /**
   * What "Post them as one comment" posts now: only the replies the card is about (failed, or held back), never a draft
   * the user left out. `bodies` is the comment's text when it holds exactly those replies, else empty (the confirm then
   * lists the replies). Null when none can go (or the API does not say).
   */
  post: { draftIds: string[]; bodies: string[]; drafts: ContributeReplyDraft[] } | null;
  /** Copy all: every thread reply of the run not posted, as the comment's text; null when the API does not say. */
  copy: { text: string; count: number } | null;
  /** The comments that failed, with a reply still failed in them. */
  failedBatches: FailedBatch[];
  /** Failed replies outside a failed comment: refused in their threads, or as comments of their own. */
  threadFailed: ContributeReplyDraft[];
  /** Replies the run's plan gave back. */
  heldBack: ContributeReplyDraft[];
};

/** The most replies one request posts (a run drafts at most this many). */
export const ONE_COMMENT_DRAFTS_MAX = 30;

/** A click's key as the API takes it. */
export const isRequestKey = (key: string) => /^[A-Za-z0-9_-]{8,64}$/.test(key);

/** A key for one click: the same key never posts twice, so it is kept until the click has its answer. */
export const requestKeyOf = (random: () => string = () => globalThis.crypto.randomUUID()) =>
  random()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 64);
