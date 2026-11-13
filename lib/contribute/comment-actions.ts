import type {
  ContributeAttemptState,
  ContributeCheckStatus,
  ContributeFeedbackThread,
  ContributeReplyDraft,
} from './contribute.types';
import type { ContributeActionResult } from './errors';
import { FOLLOW_UP_THREADS_MAX } from './follow-up-flow';
import { followUpApprovalTitle } from './follow-up-format';
import type { ActionId } from './hard-stop';

/**
 * The comments' part of a session's actions: the next step's choices (Address or Ignore per waiting thread), a run's
 * reply edits in its review, the people's-threads setting, and the states of the buttons that act on them (Start, Push).
 * One pure reducer, so the move card and the comments' list read the same state and their specs test it without a DOM.
 * The provider (`session-actions.tsx`) holds it and calls the actions.
 */

/** What a control's source is: the comments' own actions, and the session's (the provider's). */
export type ActionSource =
  | 'choice'
  | 'discard'
  | 'setting'
  | 'start'
  | 'push'
  | 'discard-run'
  | 'discard-attempt'
  | 'submit'
  | 'send-back';
/** The long actions: one runs at a time, and every control waits for it. */
export type PendingSource = 'start' | 'push' | 'discard-run' | 'discard-attempt' | 'submit' | 'send-back';
/**
 * hidden: not drawn. disabled: drawn and off, with the reason the card shows beside it; when `hidden` is true and
 * `disabled` is set, the card draws `disabled` as a line in the control's place. busy: this action is running.
 */
export type ActionState = { hidden: boolean; disabled: string | null; busy: boolean };
/** key: the commentId of a `choice` error, the draftId of a `discard` error. */
export type ActionError = { source: ActionSource; text: string; key?: string };

export type Choice = 'address' | 'ignore';
export type ReplyEdit = { text: string; send: boolean };
/** A reply as the push sends it. */
export type ReplyInput = { draftId: string; text: string; send: boolean };

/** What the pane reads on the server, for the comments' state. Serializable: it crosses to the client. */
export type CommentActionsInit = {
  /** The shown session. */
  session: 'first' | 'next' | { runId: string };
  /** The first attempt's PR. */
  prId: string | null;
  prNumber: number | null;
  /** The shown run (push, discard run), or the first attempt (discard, submit, send back). */
  attemptId: string | null;
  runState: ContributeAttemptState | null;
  /** A push that came back keeps the user's `send`. */
  approvedAt: string | null;
  flow: boolean;
  /** BLOCKED: the push is the blocked card's, not `pushState`'s. */
  checkStatus: ContributeCheckStatus | null;
  hasCommits: boolean;
  /** The shown run's drafts ([] when not answered). */
  drafts: ContributeReplyDraft[];
  /** `first.reviewFeedback?.threads ?? []` on the next step, else []. */
  threads: ContributeFeedbackThread[];
  resolveHumans: boolean | undefined;
  blocked: ReadonlySet<ActionId>;
  /** `nextRoundOpen(first)`: a run may start (false without `first`). */
  canStart: boolean;
};

export type CommentState = {
  choice: Record<string, Choice>;
  saving: readonly string[];
  edits: Record<string, ReplyEdit>;
  dropped: readonly string[];
  discarding: readonly string[];
  resolveHumans: boolean | undefined;
  settingBusy: boolean;
  pending: PendingSource | null;
  done: PendingSource | null;
  error: ActionError | null;
};

export type CommentEvent =
  | { type: 'choose'; commentId: string; choice: Choice }
  | { type: 'chosen'; commentId: string }
  | { type: 'choose-failed'; commentId: string; before: Choice; text: string }
  | { type: 'edit'; draftId: string; edit: ReplyEdit }
  | { type: 'discard'; draftId: string }
  | { type: 'discarded'; draftId: string }
  | { type: 'discard-failed'; draftId: string; text: string }
  | { type: 'setting'; on: boolean }
  | { type: 'setting-saved' }
  | { type: 'setting-failed'; before: boolean | undefined }
  | { type: 'start'; source: PendingSource }
  | { type: 'went-through'; source: PendingSource }
  | { type: 'failed'; source: ActionSource; text: string; key?: string }
  | { type: 'clear-error' };

/** The words a failed people's-threads setting shows. */
export const SETTING_ERROR = 'Your choice could not be saved. Try again.';

const editable = (draft: Pick<ContributeReplyDraft, 'state'>) => draft.state === 'DRAFT' || draft.state === 'FAILED';

/** A reply goes by default when it has words and answers what was done; a question waits for the user's own. */
export const sendsByDefault = (draft: ContributeReplyDraft) =>
  editable(draft) && Boolean(draft.text.trim()) && draft.outcome !== 'NEEDS_YOU';

/**
 * Whether a reply's thread is resolved once it posts: a thread's reply the agent fixed or answered without a change, a
 * bot's thread, or a person's with the setting on. An unanswered setting resolves only bots' threads.
 */
export const resolvesOf = (
  draft: Pick<ContributeReplyDraft, 'comment' | 'outcome' | 'bot'>,
  resolveHumans: boolean | undefined,
) =>
  Boolean(draft.comment) &&
  (draft.outcome === 'FIXED' || draft.outcome === 'SKIPPED') &&
  (draft.bot === true || resolveHumans === true);

/** The edit after typing `text`: writing into an empty reply ticks it; an edit never re-ticks one the user unticked. */
export const editAfterTyping = (edit: ReplyEdit, text: string): ReplyEdit => ({
  text,
  send: edit.text.trim() ? edit.send : Boolean(text.trim()),
});

/** The state a pane starts with, from what the server read. */
export function commentActionsInit(init: CommentActionsInit): CommentState {
  return {
    choice: Object.fromEntries(init.threads.map((thread) => [thread.commentId, thread.ignored ? 'ignore' : 'address'])),
    saving: [],
    edits: Object.fromEntries(
      init.drafts
        .filter(editable)
        .map((draft) => [
          draft.draftId,
          { text: draft.text, send: init.approvedAt && draft.send !== undefined ? draft.send : sendsByDefault(draft) },
        ]),
    ),
    dropped: [],
    discarding: [],
    resolveHumans: init.resolveHumans,
    settingBusy: false,
    pending: null,
    done: null,
    error: null,
  };
}

const without = (list: readonly string[], id: string) => list.filter((each) => each !== id);
const withOne = (list: readonly string[], id: string) => (list.includes(id) ? list : [...list, id]);

export function commentActionsReducer(state: CommentState, event: CommentEvent): CommentState {
  switch (event.type) {
    case 'choose':
      return {
        ...state,
        choice: { ...state.choice, [event.commentId]: event.choice },
        saving: withOne(state.saving, event.commentId),
        error: null,
      };
    case 'chosen':
      return { ...state, saving: without(state.saving, event.commentId) };
    case 'choose-failed':
      return {
        ...state,
        choice: { ...state.choice, [event.commentId]: event.before },
        saving: without(state.saving, event.commentId),
        error: { source: 'choice', text: event.text, key: event.commentId },
      };
    case 'edit':
      return { ...state, edits: { ...state.edits, [event.draftId]: event.edit } };
    case 'discard':
      return {
        ...state,
        dropped: withOne(state.dropped, event.draftId),
        discarding: withOne(state.discarding, event.draftId),
        error: null,
      };
    case 'discarded':
      return { ...state, discarding: without(state.discarding, event.draftId) };
    case 'discard-failed':
      return {
        ...state,
        dropped: without(state.dropped, event.draftId),
        discarding: without(state.discarding, event.draftId),
        error: { source: 'discard', text: event.text, key: event.draftId },
      };
    case 'setting':
      return { ...state, resolveHumans: event.on, settingBusy: true, error: null };
    case 'setting-saved':
      return { ...state, settingBusy: false };
    case 'setting-failed':
      return {
        ...state,
        resolveHumans: event.before,
        settingBusy: false,
        error: { source: 'setting', text: SETTING_ERROR },
      };
    case 'start':
      return { ...state, pending: event.source, error: null };
    case 'went-through':
      return { ...state, pending: null, done: event.source };
    case 'failed':
      return {
        ...state,
        pending: null,
        error: { source: event.source, text: event.text, ...(event.key ? { key: event.key } : {}) },
      };
    case 'clear-error':
      return { ...state, error: null };
  }
}

const shown = (hidden = false, disabled: string | null = null, busy = false): ActionState => ({
  hidden,
  disabled,
  busy,
});

/** The 20-comment limit, in the words the card shows in place of Start. */
export const limitLineOf = (chosen: number) =>
  `A run takes ${FOLLOW_UP_THREADS_MAX} comments at most. Set ${chosen - FOLLOW_UP_THREADS_MAX} to Ignore: they stay out of every run, autopilot's too, until you address them again or someone comments on them.`;

/** The comments' state as the card and the rows read it: what is chosen, what posts, and each button's state. */
export type CommentView = {
  threads: {
    choice: Record<string, Choice>;
    saving: ReadonlySet<string>;
    chosen: string[];
    scope: { commentIds?: string[] };
  } | null;
  replies: {
    edits: Record<string, ReplyEdit>;
    dropped: ReadonlySet<string>;
    discarding: ReadonlySet<string>;
    resolveHumans: boolean | undefined;
    resolveHumansState: ActionState;
    input: ReplyInput[];
    posting: number;
    resolving: number;
    botThreads: number;
    peopleThreads: number;
    summary: string;
  } | null;
  startState: ActionState;
  startPlainState: ActionState;
  pushState: ActionState;
};

/** The push's sentence: "pushes the new commits to pull request #1419, posts 3 replies, resolves 2 threads". */
export function pushSummaryOf({
  hasCommits,
  prNumber,
  posting,
  resolving,
}: {
  hasCommits: boolean;
  prNumber: number | null;
  posting: number;
  resolving: number;
}): string {
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  return [
    hasCommits ? `pushes the new commits to ${pr}` : 'pushes nothing (no commits this run)',
    posting ? `posts ${posting} ${posting === 1 ? 'reply' : 'replies'}` : 'posts no reply',
    resolving ? `resolves ${resolving} ${resolving === 1 ? 'thread' : 'threads'}` : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/** What the state comes to, for the card and the rows. */
export function commentViewOf(init: CommentActionsInit, state: CommentState): CommentView {
  const blocked = init.blocked;
  const startBlocked = !init.canStart || blocked.has('start_run');

  const threads = init.threads.length
    ? (() => {
        const chosen = init.threads
          .filter((thread) => state.choice[thread.commentId] === 'address')
          .map((thread) => thread.commentId);
        const allIgnoredAtRead = init.threads.every((thread) => thread.ignored);
        return {
          choice: state.choice,
          saving: new Set(state.saving),
          chosen,
          scope: chosen.length ? { commentIds: chosen } : allIgnoredAtRead ? {} : { commentIds: [] },
        };
      })()
    : null;

  const reviewing = init.runState === 'REVIEW' && init.flow;
  const replies = reviewing
    ? (() => {
        const dropped = new Set(state.dropped);
        const drafts = init.drafts.filter((draft) => editable(draft) && !dropped.has(draft.draftId));
        const editOf = (draft: ContributeReplyDraft) => state.edits[draft.draftId] ?? { text: draft.text, send: false };
        const input = drafts.map((draft) => ({
          draftId: draft.draftId,
          text: editOf(draft).text,
          send: editOf(draft).send && Boolean(editOf(draft).text.trim()),
        }));
        const sent = drafts.filter((draft) => editOf(draft).send && Boolean(editOf(draft).text.trim()));
        const resolving = sent.filter((draft) => resolvesOf(draft, state.resolveHumans)).length;
        const botThreads = sent.filter((draft) => draft.bot === true && resolvesOf(draft, undefined)).length;
        const peopleThreads = init.drafts.filter(
          (draft) => draft.comment && draft.bot !== true && !dropped.has(draft.draftId),
        ).length;
        return {
          edits: state.edits,
          dropped,
          discarding: new Set(state.discarding),
          resolveHumans: state.resolveHumans,
          resolveHumansState: shown(
            blocked.has('resolve_threads') || init.resolveHumans === undefined,
            null,
            state.settingBusy,
          ),
          input,
          posting: sent.length,
          resolving,
          botThreads,
          peopleThreads,
          summary: pushSummaryOf({
            hasCommits: init.hasCommits,
            prNumber: init.prNumber,
            posting: sent.length,
            resolving,
          }),
        };
      })()
    : null;

  const startBusy = state.pending === 'start';
  let startState: ActionState;
  if (startBlocked) startState = shown(true);
  else if (threads && threads.chosen.length > FOLLOW_UP_THREADS_MAX) {
    startState = shown(true, limitLineOf(threads.chosen.length), startBusy);
  } else {
    const waitedAtRead = !!threads && init.threads.some((thread) => !thread.ignored);
    startState = shown(
      false,
      threads?.saving.size
        ? 'Saving your choice…'
        : threads && waitedAtRead && !threads.chosen.length
          ? 'Choose a comment to address'
          : null,
      startBusy,
    );
  }

  const pushBusy = state.pending === 'push';
  const pushState = shown(
    blocked.has('push') || (init.checkStatus === 'BLOCKED' && init.hasCommits),
    init.flow && !init.hasCommits && (replies?.posting ?? 0) === 0 ? 'Tick a reply to post, or discard the run' : null,
    pushBusy,
  );

  return {
    threads,
    replies,
    startState,
    startPlainState: shown(startBlocked, null, startBusy),
    pushState,
  };
}

/** Whether a control is off: its own state, or any long action pending or gone through. */
export const isOff = (
  state: Pick<ActionState, 'disabled' | 'busy'> | null | undefined,
  { pending, done }: { pending: PendingSource | null; done: PendingSource | null },
): boolean => !!state?.disabled || !!state?.busy || pending !== null || done !== null;

/** The actions the comments' long actions call: the server actions, or test doubles. */
export type CommentCalls = {
  startFollowUp: (
    prId: string,
    commentIds: string[] | undefined,
    note: string,
  ) => Promise<ContributeActionResult<{ attemptId: string }>>;
  approveFollowUp: (
    attemptId: string,
    title: string,
    replies: ReplyInput[],
  ) => Promise<ContributeActionResult<unknown>>;
  approveAttempt: (input: {
    id: string;
    title: string;
    body: string;
    dco: boolean;
  }) => Promise<ContributeActionResult<unknown>>;
};

/** Start a run: the chosen comments (the next-run card), or none ("Try run N", "Start a run anyway"). */
export const callStart = (
  init: Pick<CommentActionsInit, 'prId'>,
  note: string,
  scope: { commentIds?: string[] },
  calls: Pick<CommentCalls, 'startFollowUp'>,
) => calls.startFollowUp(init.prId ?? '', scope.commentIds, note);

/**
 * Push a run: with the follow-up flow, its commits and the replies as edited; without it (an older API), the commits
 * alone, as an approval of the run.
 */
export const callPush = (
  init: Pick<CommentActionsInit, 'attemptId' | 'prNumber' | 'flow'>,
  input: ReplyInput[],
  calls: Pick<CommentCalls, 'approveFollowUp' | 'approveAttempt'>,
) =>
  init.flow
    ? calls.approveFollowUp(init.attemptId ?? '', followUpApprovalTitle(init.prNumber), input)
    : calls.approveAttempt({
        id: init.attemptId ?? '',
        title: followUpApprovalTitle(init.prNumber),
        body: '',
        dco: false,
      });
