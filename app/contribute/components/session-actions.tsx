'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useMemo, useReducer, useState } from 'react';

import {
  approveAttempt,
  approveFollowUp,
  discardAttempt,
  type FollowUpReplyInput,
  ignoreReviewThreads,
  sendBackToAgent,
  setResolveHumanThreads,
  startFollowUp,
} from '../actions';
import { attemptHref } from './reviews-ready';
import {
  type ActionError,
  type ActionSource,
  type ActionState,
  type Choice,
  type CommentActionsInit,
  type CommentView,
  callPush,
  callStart,
  commentActionsInit,
  commentActionsReducer,
  commentViewOf,
  isOff,
  type PendingSource,
  type ReplyEdit,
} from '@/lib/contribute/comment-actions';
import { attemptActionErrorMessage, type ContributeActionResult } from '@/lib/contribute/errors';
import { followUpErrorMessage } from '@/lib/contribute/follow-up-format';
import { CONNECTION_FAILED_OF, runLong } from '@/lib/contribute/session-head-logic';

export type { ActionError, ActionSource, ActionState, PendingSource } from '@/lib/contribute/comment-actions';

/**
 * A session's actions, one client provider around its head (the move card) and its review comments: the comments'
 * choices and edits (the reducer in `comment-actions.ts`), the long actions that share one pending state and one error
 * (start, push, discard a run or an attempt, submit, send back), and the pull request form's open state. The card's
 * buttons and the rows read it, so a swap of the shown card keeps every choice and edit.
 */
export type SessionActions = {
  threads: {
    choice: Record<string, Choice>;
    saving: ReadonlySet<string>;
    chosen: string[];
    scope: { commentIds?: string[] };
    setChoice(commentId: string, choice: Choice): Promise<void>;
  } | null;
  replies: {
    edits: Record<string, ReplyEdit>;
    dropped: ReadonlySet<string>;
    discarding: ReadonlySet<string>;
    setEdit(draftId: string, edit: ReplyEdit): void;
    discardComment(draftId: string): Promise<void>;
    resolveHumans: boolean | undefined;
    resolveHumansState: ActionState;
    setResolveHumans(on: boolean): Promise<void>;
    input(): FollowUpReplyInput[];
    posting: number;
    resolving: number;
    botThreads: number;
    peopleThreads: number;
    summary: string;
  } | null;
  flow: boolean;
  /** `origin`: the control that started it (`next-run`, `try-run`, `anyway`): its error is that control's key. */
  start(note: string, scope: { commentIds?: string[] }, origin?: string): Promise<void>;
  startState: ActionState;
  startPlainState: ActionState;
  push(): Promise<void>;
  pushState: ActionState;
  discardRun(): Promise<void>;
  discardRunState: ActionState;
  discardAttempt(): Promise<void>;
  discardAttemptState: ActionState;
  submitting(run: () => Promise<ContributeActionResult<unknown>>): Promise<void>;
  submitState: ActionState;
  sendBack(note: string): Promise<void>;
  sendBackState: ActionState;
  pending: PendingSource | null;
  done: PendingSource | null;
  error: ActionError | null;
  /** The pull request form's open state: on a first attempt in review only. */
  form: { open: boolean; setOpen(open: boolean): void } | null;
  /** The action whose dialog is open (the submit's, a discard's): its error shows there, not in the card. */
  dialog: ActionSource | null;
  setDialog(source: ActionSource | null): void;
  /** Sets the error without a call: a refusal found on the client (the grant's way to GitHub, say). */
  fail(source: ActionSource, text: string): void;
};

const Context = createContext<SessionActions | null>(null);

/** The session's actions; null outside a provider (a button rendered alone reads as nothing pending). */
export const useSessionActions = () => useContext(Context);

/** Whether a control is off: its own state, or a long action pending or gone through. Nothing pending outside one. */
export const offOf = (actions: SessionActions | null, state?: Pick<ActionState, 'disabled' | 'busy'> | null) =>
  isOff(state, { pending: actions?.pending ?? null, done: actions?.done ?? null });

/** For the catalogue and the specs: a static render shows a pending, failed or open state without a click. */
export type SessionActionsSeed = { pending?: PendingSource; error?: ActionError; formOpen?: boolean };

const stateOf = (hidden: boolean, busy: boolean): ActionState => ({ hidden, disabled: null, busy });

export function SessionActionsProvider({
  init,
  form: formInit,
  seed,
  children,
}: {
  init: CommentActionsInit;
  /** The form's open state as the page opens (after a bounce, back from GitHub); undefined: no form on this pane. */
  form?: boolean;
  seed?: SessionActionsSeed;
  children: ReactNode;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(commentActionsReducer, init, (from) => ({
    ...commentActionsInit(from),
    pending: seed?.pending ?? null,
    error: seed?.error ?? null,
  }));
  const [formOpen, setFormOpen] = useState(seed?.formOpen ?? formInit ?? false);
  const [dialog, setDialog] = useState<ActionSource | null>(null);
  const view: CommentView = useMemo(() => commentViewOf(init, state), [init, state]);

  const long = async (
    source: PendingSource,
    call: () => Promise<ContributeActionResult<unknown>>,
    then: () => void,
  ) => {
    if (state.pending || state.done) return;
    dispatch({ type: 'start', source });
    const failure = await runLong(call, CONNECTION_FAILED_OF[source]);
    if (failure) {
      dispatch({ type: 'failed', source, text: failure });
      return;
    }
    dispatch({ type: 'went-through', source });
    then();
  };

  const actions: SessionActions = {
    threads: view.threads && {
      ...view.threads,
      async setChoice(commentId, choice) {
        const before = state.choice[commentId] ?? 'address';
        if (before === choice || state.saving.includes(commentId) || !init.prId) return;
        dispatch({ type: 'choose', commentId, choice });
        const result = await ignoreReviewThreads(init.prId, [commentId], choice === 'ignore').catch(() => null);
        if (result?.ok) dispatch({ type: 'chosen', commentId });
        else {
          dispatch({
            type: 'choose-failed',
            commentId,
            before,
            text: result ? followUpErrorMessage(result.error, result.message) : followUpErrorMessage('FAILED'),
          });
        }
      },
    },
    replies: view.replies && {
      ...view.replies,
      input: () => view.replies?.input ?? [],
      setEdit(draftId, edit) {
        dispatch({ type: 'edit', draftId, edit });
      },
      async discardComment(draftId) {
        const draft = init.drafts.find((each) => each.draftId === draftId);
        const commentId = draft?.comment?.commentId;
        if (!draft?.prId || !commentId) return;
        dispatch({ type: 'discard', draftId });
        const result = await ignoreReviewThreads(draft.prId, [commentId]).catch(() => null);
        if (result?.ok) {
          dispatch({ type: 'discarded', draftId });
          router.refresh();
        } else {
          dispatch({
            type: 'discard-failed',
            draftId,
            text: result
              ? attemptActionErrorMessage(result.error, result.message)
              : attemptActionErrorMessage('FAILED'),
          });
        }
      },
      async setResolveHumans(on) {
        if (view.replies?.resolveHumansState.hidden) return;
        const before = state.resolveHumans;
        dispatch({ type: 'setting', on });
        const result = await setResolveHumanThreads(on).catch(() => null);
        dispatch(result?.ok ? { type: 'setting-saved' } : { type: 'setting-failed', before });
      },
    },
    flow: init.flow,
    async start(note, scope, origin) {
      if (state.pending || state.done) return;
      dispatch({ type: 'start', source: 'start' });
      const result = await callStart(init, note, scope, { startFollowUp }).catch(() => null);
      if (!result?.ok) {
        dispatch({
          type: 'failed',
          source: 'start',
          text: result ? followUpErrorMessage(result.error, result.message) : CONNECTION_FAILED_OF.start,
          ...(origin ? { key: origin } : {}),
        });
        return;
      }
      dispatch({ type: 'went-through', source: 'start' });
      router.push(attemptHref(result.data.attemptId));
    },
    startState: view.startState,
    startPlainState: view.startPlainState,
    push: () =>
      long(
        'push',
        () => callPush(init, view.replies?.input ?? [], { approveFollowUp, approveAttempt }),
        () => router.refresh(),
      ),
    pushState: view.pushState,
    discardRun: () =>
      long(
        'discard-run',
        () => discardAttempt(init.attemptId ?? ''),
        () => router.refresh(),
      ),
    discardRunState: stateOf(init.blocked.has('discard_run'), state.pending === 'discard-run'),
    discardAttempt: () =>
      long(
        'discard-attempt',
        () => discardAttempt(init.attemptId ?? ''),
        () => router.refresh(),
      ),
    discardAttemptState: stateOf(false, state.pending === 'discard-attempt'),
    submitting: (run) => long('submit', run, () => router.refresh()),
    submitState: stateOf(false, state.pending === 'submit'),
    sendBack: (note) =>
      long(
        'send-back',
        () => sendBackToAgent(init.attemptId ?? '', note),
        () => router.refresh(),
      ),
    sendBackState: stateOf(false, state.pending === 'send-back'),
    pending: state.pending,
    done: state.done,
    error: state.error,
    form: formInit === undefined ? null : { open: formOpen, setOpen: setFormOpen },
    dialog,
    setDialog,
    fail(source, text) {
      dispatch({ type: 'failed', source, text });
    },
  };

  return <Context.Provider value={actions}>{children}</Context.Provider>;
}
