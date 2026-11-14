import { type Tone, toneLabelOf, wordsOf } from './attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeAttemptState,
  ContributeFeedbackThread,
  ContributeReplyDraft,
} from './contribute.types';
import { OUTCOMES } from './follow-up-flow';
import { REPLY_STATES } from './follow-up-format';
import { relativeLabel } from './format';
import type { ActionId } from './hard-stop';
import { inOneComment, isHeldBack, waitsForProbe } from './one-comment';
import { BLOCK_REASONS, RETRY_REASONS, reasonKeyOf, replyTroubleOf } from './reply-trouble';

/**
 * Review comments, one list for a comment's whole life on a contribution's page (M7): waiting for a run (Address or
 * Ignore), in a run's review (the reply to edit and tick), and after (each reply's state). Rows are grouped by what the
 * user does with them, never by bots and people. Pure: the list, the move card and their specs read the same.
 */

/** How the list reads its rows: the next step's waiting threads, a run's review, read-only, or each reply's state. */
export type RowMode = 'waiting' | 'review' | 'readOnly' | 'perReply';

export type RowState =
  | 'waiting'
  | 'ignored'
  | 'needs-you'
  | 'draft-review'
  | 'read-only'
  | 'posting'
  | 'posted'
  | 'posted-comment'
  | 'posted-one-comment'
  | 'posted-resolved'
  | 'resolve-failed'
  | 'not-posted-elsewhere'
  | 'not-posted-own'
  | 'left-for-github'
  | 'no-reply'
  | 'draft-not-sent'
  | 'waits-for-probe'
  | 'held-back'
  | 'dismissed-by-hand'
  | 'dismissed'
  | 'thread-resolved'
  | 'unknown';

export type GroupId = 'list' | 'needs-you' | 'ready' | 'not-posted' | 'posted' | 'resolved' | 'dismissed' | 'ignored';

/** What a row's state reads besides its draft. */
export type RowContext = {
  /** The run that drafted it: its state decides whether an approved reply is still being sent. */
  runState: ContributeAttemptState | null;
  /** The reasons said at the run's scope (by the move card, or by the list's own line): its rows say only "Not posted". */
  saidElsewhere: ReadonlySet<string>;
};

/** The mode a run's comments read in, from its state and whether its API speaks the follow-up flow. */
export function runModeOf(run: Pick<ContributeAttemptDetail, 'state' | 'patch'>, flow: boolean): RowMode {
  if (run.state === 'REVIEW' && flow) return 'review';
  if (run.state === 'PENDING_AUTOSUBMIT') return 'readOnly';
  if ((run.state === 'STOPPED' || run.state === 'DISCARDED') && run.patch?.trim()) return 'readOnly';
  return 'perReply';
}

const editable = (draft: Pick<ContributeReplyDraft, 'state'>) => draft.state === 'DRAFT' || draft.state === 'FAILED';

/** A reply's state in each mode: the mode first, then the draft's state. */
export function rowStateOf(mode: RowMode, draft: ContributeReplyDraft, ctx: RowContext): RowState {
  if (mode === 'review' && editable(draft)) {
    return draft.outcome === 'NEEDS_YOU' && !draft.text.trim() ? 'needs-you' : 'draft-review';
  }
  if (mode === 'readOnly' && editable(draft)) return 'read-only';
  switch (draft.state) {
    case 'POSTING':
      return 'posting';
    case 'POSTED':
      if (draft.resolveState === 'RESOLVING') return 'posting';
      if (inOneComment(draft)) return 'posted-one-comment';
      if (draft.asComment) return 'posted-comment';
      if (draft.resolveState === 'RESOLVED') return 'posted-resolved';
      if (draft.resolveState === 'FAILED') return 'resolve-failed';
      return 'posted';
    case 'FAILED':
      return ctx.saidElsewhere.has(reasonKeyOf(draft)) ? 'not-posted-elsewhere' : 'not-posted-own';
    case 'DRAFT':
      // The run's plan: held until its first reply answers in its thread, or given back when that did not go.
      if (waitsForProbe(draft)) return 'waits-for-probe';
      if (isHeldBack(draft)) return 'held-back';
      if (draft.send === true && (ctx.runState === 'SUBMITTING' || ctx.runState === 'DONE')) return 'posting';
      if (!draft.text.trim()) return draft.outcome === 'NEEDS_YOU' ? 'left-for-github' : 'no-reply';
      return 'draft-not-sent';
    case 'DISMISSED':
      if (draft.dismissedReason === 'POSTED_BY_HAND') return 'dismissed-by-hand';
      if (draft.dismissedReason === 'THREAD_RESOLVED') return 'thread-resolved';
      return 'dismissed';
    default:
      return 'unknown';
  }
}

/** A waiting thread's row: as read, Ignored when it was ignored in an earlier run. */
export const threadStateOf = (thread: Pick<ContributeFeedbackThread, 'ignored'>): RowState =>
  thread.ignored ? 'ignored' : 'waiting';

const GROUP_OF: Record<RowState, GroupId> = {
  waiting: 'list',
  'read-only': 'list',
  ignored: 'ignored',
  'needs-you': 'needs-you',
  'draft-review': 'ready',
  'draft-not-sent': 'ready',
  'not-posted-elsewhere': 'not-posted',
  'not-posted-own': 'not-posted',
  'held-back': 'not-posted',
  posting: 'posted',
  'waits-for-probe': 'posted',
  'posted-one-comment': 'posted',
  posted: 'posted',
  'posted-comment': 'posted',
  'posted-resolved': 'posted',
  'resolve-failed': 'posted',
  'left-for-github': 'posted',
  'no-reply': 'posted',
  'thread-resolved': 'resolved',
  'dismissed-by-hand': 'dismissed',
  dismissed: 'dismissed',
  unknown: 'dismissed',
};

export const GROUP_ORDER: GroupId[] = [
  'list',
  'needs-you',
  'ready',
  'not-posted',
  'posted',
  'resolved',
  'dismissed',
  'ignored',
];

export const GROUP_TITLES: Record<GroupId, string> = {
  list: 'Review comments',
  'needs-you': 'Needs you',
  ready: 'Ready to post',
  'not-posted': 'Not posted',
  posted: 'Posted',
  resolved: 'Resolved on GitHub',
  dismissed: 'Dismissed',
  ignored: 'Ignored',
};

/** Groups that start closed. */
export const COLLAPSED: ReadonlySet<GroupId> = new Set(['resolved', 'dismissed', 'ignored']);

/** A row: a draft's or a waiting thread's, its key (`draftId` or `commentId`) and its state. */
export type CommentRowItem =
  | { key: string; state: RowState; draft: ContributeReplyDraft; thread?: undefined }
  | { key: string; state: RowState; thread: ContributeFeedbackThread; draft?: undefined };

export type CommentGroup = {
  id: GroupId;
  rows: CommentRowItem[];
  collapsed: boolean;
  /** Rows past the first `SHOWN_BEFORE_MORE`, folded under "Show N more". */
  more: number;
};

/** An open group of more than this many rows shows the first `SHOWN_BEFORE_MORE` (waiting and per-reply lists). */
export const MORE_AFTER = 7;
export const SHOWN_BEFORE_MORE = 5;

/** The rows in their groups, in order. Membership is decided from the data as read, never from edits. */
export function groupsOf(rows: CommentRowItem[], mode: RowMode): CommentGroup[] {
  return GROUP_ORDER.flatMap((id) => {
    const members = rows.filter((row) => GROUP_OF[row.state] === id);
    if (!members.length) return [];
    const collapsed = COLLAPSED.has(id);
    const folds = !collapsed && mode !== 'review' && members.length > MORE_AFTER;
    return [{ id, rows: members, collapsed, more: folds ? members.length - SHOWN_BEFORE_MORE : 0 }];
  });
}

/** What must open before a row shows: its collapsed group, or its group's "Show N more". Null for an unknown key. */
export function rowTargetOf(
  groups: CommentGroup[],
  key: string,
): { group: GroupId; openGroup: boolean; showMore: boolean } | null {
  for (const group of groups) {
    const at = group.rows.findIndex((row) => row.key === key);
    if (at < 0) continue;
    return { group: group.id, openGroup: group.collapsed, showMore: group.more > 0 && at >= SHOWN_BEFORE_MORE };
  }
  return null;
}

/** `live`: a dot that breathes beside it while the reply is on its way. */
export type Chip = { label: string; tone: Tone; check: boolean; live?: boolean };

/** The words at a row's right end; null where the group says it (resolved on GitHub) or the row has a control. */
export function chipOf(state: RowState, draft?: ContributeReplyDraft): Chip | null {
  switch (state) {
    case 'posting':
      return { label: 'Posting…', tone: 'violet', check: false, live: true };
    case 'posted':
      return { label: 'Replied', tone: 'green', check: true };
    case 'posted-comment':
      return { label: 'Replied in a comment', tone: 'green', check: true };
    case 'posted-one-comment':
      return { label: 'Posted in one comment', tone: 'green', check: true };
    case 'waits-for-probe':
      return { label: 'Waits for the first reply', tone: 'neutral', check: false };
    case 'held-back':
      return { label: 'Held back', tone: 'amber', check: false };
    case 'posted-resolved':
      return { label: 'Replied · resolved', tone: 'green', check: true };
    case 'resolve-failed':
      return { label: 'Replied · not resolved', tone: 'amber', check: false };
    case 'not-posted-elsewhere':
    case 'not-posted-own':
      return {
        label: 'Not posted',
        tone: draft && BLOCK_REASONS.has(reasonKeyOf(draft)) ? 'amber' : 'red',
        check: false,
      };
    case 'left-for-github':
      return { label: 'Left for GitHub', tone: 'neutral', check: false };
    case 'no-reply':
      return { label: 'No reply', tone: 'neutral', check: false };
    case 'draft-not-sent':
      return { label: 'Draft', tone: 'neutral', check: false };
    case 'dismissed-by-hand':
      return { label: 'Posted by you', tone: 'neutral', check: false };
    case 'dismissed':
      return { label: 'Dismissed', tone: 'neutral', check: false };
    case 'unknown': {
      const words = draft ? toneLabelOf(REPLY_STATES, draft.state) : { label: 'Unknown', tone: 'neutral' as const };
      return { label: words.label || wordsOf(String(draft?.state ?? '')), tone: 'neutral', check: false };
    }
    default:
      return null;
  }
}

/** Rows whose lines are muted: the dismissed. */
export const isMuted = (state: RowState) => state === 'dismissed' || state === 'dismissed-by-hand';

/** What a reply's post control needs besides its draft. */
export type PostContext = {
  blocked: ReadonlySet<ActionId>;
  /** The first attempt's pull request is open (a run whose first attempt is not known: true, the API says why). */
  prOpen: boolean;
  /** Why the run's replies cannot post yet (`replyBlockOf`); null when they can, or when no run is known. */
  replyBlock: string | null;
  grantConnected: boolean;
  grantAvailable: boolean;
};

/** A reply's own post control: post it again (in its thread, or as the comment it failed as), or ask for access. */
export type PostAction = { kind: 'retry'; asComment: boolean } | { kind: 'as-comment' } | { kind: 'grant' } | null;

const GRANT_REASONS = new Set(['grant_missing', 'grant_revoked']);

/** Whether a reply may be posted from here at all: not held back by a stop, an open PR, its commits on it. */
export const canPostOf = (ctx: PostContext) => !ctx.blocked.has('post_reply') && ctx.prOpen && !ctx.replyBlock;

/** The post action of a reply that failed for a reason of its own (and of those M7's own line covers), first match. */
export function postActionOf(
  draft: Pick<ContributeReplyDraft, 'lastError' | 'asComment' | 'canPostAsComment' | 'batchId' | 'canGoInOneComment'>,
  ctx: PostContext,
): PostAction {
  if (!canPostOf(ctx)) return null;
  // In a comment that failed: the move card tries the comment again, never the reply alone.
  if (draft.batchId) return null;
  const reason = reasonKeyOf(draft);
  if (GRANT_REASONS.has(reason)) {
    if (ctx.grantConnected) return { kind: 'retry', asComment: draft.asComment === true };
    return ctx.grantAvailable ? { kind: 'grant' } : null;
  }
  if (draft.asComment === true) return RETRY_REASONS.has(reason) ? { kind: 'retry', asComment: true } : null;
  // GitHub refused it in its thread: the move card posts it as a comment (one or more replies, each quoting its
  // thread). Only an API that does not say which replies may go so keeps the reply's own "Post as a comment instead".
  if (draft.canPostAsComment === true) return draft.canGoInOneComment === undefined ? { kind: 'as-comment' } : null;
  if (RETRY_REASONS.has(reason)) return { kind: 'retry', asComment: false };
  return null;
}

/**
 * What an opened row offers, by its state: a post control, Dismiss, Discard comment, the copy box and the thread's
 * link. `byCard`: a failed reply whose reason the move card says (the card has Copy all, Dismiss, Try all again).
 */
export function rowActionsOf(
  state: RowState,
  draft: ContributeReplyDraft,
  ctx: PostContext & { byCard: boolean },
): {
  post: PostAction | { kind: 'post' };
  dismiss: boolean;
  discard: boolean;
} {
  const none = { post: null, dismiss: false, discard: false };
  switch (state) {
    case 'draft-review':
    case 'needs-you':
      // Discard comment only on a thread's reply: a top-level comment has no thread to leave out.
      return { ...none, discard: !!draft.comment && !!draft.prId };
    case 'not-posted-own':
      return { post: postActionOf(draft, ctx), dismiss: true, discard: false };
    case 'not-posted-elsewhere':
      if (ctx.byCard) {
        // The move card posts them as one comment. Only an API that does not say which replies may go so keeps a
        // reply's own "Post as a comment instead".
        return {
          post:
            canPostOf(ctx) &&
            draft.canPostAsComment === true &&
            !draft.asComment &&
            draft.canGoInOneComment === undefined
              ? { kind: 'as-comment' }
              : null,
          dismiss: false,
          discard: false,
        };
      }
      return { post: postActionOf(draft, ctx), dismiss: true, discard: false };
    case 'held-back':
      // The move card posts them as one comment, or dismisses them; without a card, the reply can be dismissed here.
      return { ...none, dismiss: !ctx.byCard };
    case 'draft-not-sent':
      return { post: canPostOf(ctx) ? { kind: 'post' } : null, dismiss: true, discard: false };
    case 'left-for-github':
    case 'no-reply':
      return { ...none, dismiss: true };
    default:
      return none;
  }
}

/** `normalize-path.ts:3`: a thread's file by its base name and line; '' for a thread on the whole diff. */
export function shortWhereOf(where: { path: string | null; line: number | null } | null | undefined): string {
  if (!where?.path) return '';
  const base = where.path.split('/').at(-1) || where.path;
  return `${base}${where.line ? `:${where.line}` : ''}`;
}

/**
 * The reasons said by the list's own line, per run: those shared among its per-reply "Not posted" rows that the move
 * card does not say (`cardReasons` of the run).
 */
export function ownLinesOf(
  drafts: readonly ContributeReplyDraft[],
  cardReasons: (runId: string) => ReadonlySet<string>,
): { runId: string; reason: string; drafts: ContributeReplyDraft[] }[] {
  return replyTroubleOf(drafts).flatMap((run) =>
    run.shared
      .filter(({ reason }) => !cardReasons(run.runId).has(reason))
      .map(({ reason, drafts: list }) => ({ runId: run.runId, reason, drafts: list })),
  );
}

/** The resolve failures two or more posted replies share: said once, under the Posted group. */
export function resolveLinesOf(
  drafts: readonly ContributeReplyDraft[],
): { reason: string; note: string; count: number }[] {
  const byReason = new Map<string, ContributeReplyDraft[]>();
  for (const draft of drafts) {
    if (draft.state !== 'POSTED' || draft.resolveState !== 'FAILED') continue;
    byReason.set(reasonKeyOf(draft), [...(byReason.get(reasonKeyOf(draft)) ?? []), draft]);
  }
  return [...byReason.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([reason, list]) => ({
      reason,
      note: list[0].lastError?.note?.trim() || 'GitHub did not resolve them.',
      count: list.length,
    }));
}

/** The first attempt lists only the drafts of runs the rail does not show; all of them when the runs are not listed. */
export function firstAttemptDraftsOf(first: Pick<ContributeAttemptDetail, 'replyDrafts' | 'followUps'>) {
  const history = first.followUps?.history;
  const drafts = first.replyDrafts ?? [];
  if (!history) return drafts;
  const listed = new Set(history.map(({ attemptId }) => attemptId));
  return drafts.filter((draft) => !listed.has(draft.attemptId));
}

/**
 * What the page last read of a reply and what it depends on: an action that went through keeps the row's other actions
 * off until this changes.
 */
export function rowVersionOf(
  draft: Pick<ContributeReplyDraft, 'state' | 'updatedAt'>,
  of:
    | { run: Pick<ContributeAttemptDetail, 'state' | 'updatedAt'> }
    | { first: Pick<ContributeAttemptDetail, 'state' | 'updatedAt' | 'followUps'> },
): string {
  if ('run' in of) return [draft.state, draft.updatedAt, of.run.state, of.run.updatedAt].join('|');
  return [
    draft.state,
    draft.updatedAt,
    of.first.state,
    of.first.updatedAt,
    of.first.followUps?.currentAttemptId ?? '',
  ].join('|');
}

/** "4 fixed · 1 not changed · 1 for you", from the rows' outcomes; null when none has one. */
function talliesOf(drafts: ContributeReplyDraft[]): string | null {
  const count = (outcome: string) => drafts.filter((draft) => draft.outcome === outcome).length;
  const parts = [
    count('FIXED') ? `${count('FIXED')} fixed` : null,
    count('SKIPPED') ? `${count('SKIPPED')} not changed` : null,
    count('NEEDS_YOU') ? `${count('NEEDS_YOU')} for you` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** The section's header: a count, and one fact on its right. */
export type CommentsSummary = { count: { label: string; tone: Tone }; fact: string | null };

/**
 * The header's count and fact, by mode: waiting threads by how many are set to Address and when they were read; a
 * review by its tallies; after the run, what was replied and resolved, or nothing posted.
 */
export function summaryOf(
  rows: CommentRowItem[],
  mode: RowMode,
  run: { state: ContributeAttemptState; hasPatch: boolean; flow: boolean } | null,
  extra: { addressed?: number; readAt?: string | null; now?: Date } = {},
): CommentsSummary {
  if (mode === 'waiting') {
    const addressed = extra.addressed ?? rows.filter((row) => row.state === 'waiting').length;
    return {
      count: { label: `${addressed} waiting`, tone: addressed ? 'amber' : 'neutral' },
      fact: extra.readAt ? `read ${relativeLabel(extra.readAt, extra.now)}` : null,
    };
  }
  const drafts = rows.flatMap((row) => (row.draft ? [row.draft] : []));
  const count = { label: String(rows.length), tone: 'neutral' as const };
  const tallies = talliesOf(drafts);
  if (run && (run.state === 'STOPPED' || run.state === 'DISCARDED') && run.hasPatch) {
    return { count, fact: 'Nothing posted' };
  }
  if (mode === 'review' || mode === 'readOnly') {
    return { count, fact: tallies ?? `${drafts.length} drafted` };
  }
  if (run?.state === 'REVIEW' && !run.flow) return { count, fact: `${drafts.length} drafted` };
  if (
    drafts.length &&
    drafts.every((draft) => draft.state === 'DISMISSED' && draft.dismissedReason === 'THREAD_RESOLVED')
  ) {
    return { count, fact: [tallies, 'all resolved'].filter(Boolean).join(' · ') };
  }
  const replied = drafts.filter((draft) => draft.state === 'POSTED').length;
  if (replied) {
    const resolved = drafts.filter(
      (draft) =>
        (draft.state === 'POSTED' && draft.resolveState === 'RESOLVED') ||
        (draft.state === 'DISMISSED' && draft.dismissedReason === 'THREAD_RESOLVED'),
    ).length;
    return {
      count,
      fact: [`${replied} replied`, resolved ? `${resolved} resolved` : null].filter(Boolean).join(' · '),
    };
  }
  return { count, fact: tallies };
}

/** The outcome pill's words; null for a draft without one (an older API). */
export const outcomePillOf = (draft: Pick<ContributeReplyDraft, 'outcome'>) =>
  draft.outcome ? OUTCOMES[draft.outcome] : null;
