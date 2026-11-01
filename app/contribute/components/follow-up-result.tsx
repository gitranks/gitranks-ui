'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { approveFollowUp, discardAttempt, ignoreReviewThreads, setResolveHumanThreads } from '../actions';
import { ApproveReplyButton } from './approve-reply-button';
import { ConfirmDialog } from './confirm-dialog';
import { HEADING, Pill } from './primitives';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type {
  ContributeAttemptDetail,
  ContributeCheckStatusView,
  ContributeReplyDraft,
} from '@/lib/contribute/contribute.types';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';
import {
  CHECK_STATUSES,
  OUTCOMES,
  replyPreviewOf,
  threadAfterOf,
  threadsByWho,
  whereOfThread,
} from '@/lib/contribute/follow-up-flow';
import { followUpApprovalTitle } from '@/lib/contribute/follow-up-format';
import { cn } from '@/lib/utils';

/** The user's edit of one reply: its text, and whether it goes with the push. */
type Edit = { text: string; send: boolean };

const editable = (draft: ContributeReplyDraft) => draft.state === 'DRAFT' || draft.state === 'FAILED';

/** A reply goes by default when it has words and answers what was done; a question waits for the user's own. */
const sendsByDefault = (draft: ContributeReplyDraft) =>
  editable(draft) && Boolean(draft.text.trim()) && draft.outcome !== 'NEEDS_YOU';

/** Whether a reply's thread is resolved once it posts: a bot's answered thread, or a person's with the setting on. */
const resolvesOf = (draft: ContributeReplyDraft, resolveHumans: boolean) =>
  Boolean(draft.comment) &&
  (draft.outcome === 'FIXED' || draft.outcome === 'SKIPPED') &&
  (draft.bot === true || resolveHumans);

/** Our checks in a block: what they found, in plain words, and what it means for the push. */
export function CheckStatusNote({ status }: { status: ContributeCheckStatusView | null | undefined }) {
  if (!status) return null;
  const shown = CHECK_STATUSES[status.status] ?? CHECK_STATUSES.FAILED;
  return (
    <div
      data-check-status={status.status}
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5',
        shown.tone === 'green' && 'border-positive/30 bg-positive/5',
        shown.tone === 'amber' && 'border-warning/30 bg-warning-soft',
        shown.tone === 'red' && 'border-negative/30 bg-negative/5',
      )}
    >
      <span className="text-sm font-semibold">{shown.title}</span>
      <span className="text-sm text-muted-foreground">{status.note}</span>
    </div>
  );
}

/** One thread: what it said, what the agent did and why, and the reply, editable while it is not posted. */
function ThreadResult({
  draft,
  edit,
  onEdit,
  readOnly,
  resolveHumans,
  postLater = null,
  onDiscard = null,
}: {
  draft: ContributeReplyDraft;
  edit: Edit;
  onEdit: (edit: Edit) => void;
  readOnly: boolean;
  resolveHumans: boolean;
  /** After the push: a reply that did not go with it may still be posted, one by one. */
  postLater?: { prNumber: number | null; version: string } | null;
  /** In the review: leave this comment out for good (its reply too), until someone comments on it again. */
  onDiscard?: (() => void) | null;
}) {
  const outcome = draft.outcome ? OUTCOMES[draft.outcome] : null;
  const where = draft.comment ? whereOfThread(draft.comment) : '';
  const after = threadAfterOf(draft);
  const postedUrl = githubUrlOf(draft.url);
  const fieldId = `reply-${draft.draftId}`;
  const prefix = (draft.prefix ?? '').replace('<commit>', 'the new commit');
  const resolves = resolvesOf(draft, resolveHumans);
  const who = draft.comment
    ? `${draft.comment.author || 'a reviewer'}${where ? ` on ${where}` : ''}`
    : 'the pull request';
  const unsent = postLater && editable(draft) && draft.text.trim();

  return (
    <li
      data-thread-result={draft.draftId}
      data-outcome={draft.outcome ?? ''}
      data-reply-state={draft.state}
      className="flex flex-col gap-2.5 px-4 py-4"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {outcome ? <Pill tone={outcome.tone}>{outcome.label}</Pill> : null}
        <span className="font-medium text-foreground/80">
          {draft.comment ? draft.comment.author || 'A reviewer' : 'Comment on the pull request'}
        </span>
        {where ? <span className="font-mono break-all">{where}</span> : null}
        {onDiscard ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            aria-label={`Discard the comment of ${who}: no reply, and left out until someone comments on it again`}
            className="ml-auto min-h-9"
          >
            Discard comment
          </Button>
        ) : null}
      </div>
      {draft.comment ? (
        <blockquote className="border-l-2 pl-3 text-sm break-words whitespace-pre-line text-muted-foreground">
          {draft.comment.excerpt}
        </blockquote>
      ) : null}
      {draft.reason ? (
        <p className="text-sm">
          <span className="font-medium">{draft.outcome === 'NEEDS_YOU' ? 'Question for you: ' : 'Why: '}</span>
          <span className="break-words">{draft.reason}</span>
        </p>
      ) : null}
      {readOnly ? (
        draft.text.trim() ? (
          <p className="rounded-lg bg-muted/60 p-3 text-sm break-words whitespace-pre-wrap">
            {draft.state === 'POSTED' ? draft.text : replyPreviewOf(draft.prefix, draft.text)}
          </p>
        ) : null
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-xs font-medium">
            Reply, posted in your name{prefix ? ` after “${prefix.trim()}”` : ''}
            <span className="sr-only"> (to {who})</span>
          </label>
          <Textarea
            id={fieldId}
            value={edit.text}
            onChange={(event) =>
              // Writing into an empty reply means to post it; an edit never ticks one the user unticked.
              onEdit({
                text: event.target.value,
                send: edit.text.trim() ? edit.send : Boolean(event.target.value.trim()),
              })
            }
            rows={2}
            placeholder={draft.outcome === 'NEEDS_YOU' ? 'Write your answer, or leave it for GitHub' : undefined}
            className="min-h-16 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={edit.send && Boolean(edit.text.trim())}
              disabled={!edit.text.trim()}
              onChange={(event) => onEdit({ ...edit, send: event.target.checked })}
              aria-label={`Post the reply to ${who}`}
              className="size-4 accent-primary"
            />
            Post this reply
            {draft.comment ? (
              <span className="text-xs text-muted-foreground">
                {resolves ? '· then resolve the thread' : '· the thread stays open for its reviewer'}
              </span>
            ) : null}
          </label>
        </div>
      )}
      {unsent ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Not posted with the push. Post it now if you want it.</span>
          <ApproveReplyButton
            draftId={draft.draftId}
            version={postLater.version}
            where={
              draft.comment
                ? `as a reply to ${who}`
                : `as a comment on ${postLater.prNumber ? `pull request #${postLater.prNumber}` : 'the pull request'}`
            }
            again={draft.state === 'FAILED'}
            blocked={null}
          />
        </div>
      ) : null}
      {after ? (
        <span
          role={draft.state === 'FAILED' || draft.resolveState === 'FAILED' ? 'alert' : undefined}
          className={cn(
            'text-sm',
            draft.state === 'FAILED' || draft.resolveState === 'FAILED' ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          {after}
          {postedUrl ? (
            <>
              {' '}
              <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
                See it on GitHub ↗
              </a>
            </>
          ) : null}
        </span>
      ) : null}
    </li>
  );
}

/**
 * A follow-up's result: our checks in plain words, what it did about each review thread with its reply, and, in review,
 * one approval that pushes the commits and posts the replies chosen (bots' threads resolved after; people's left open
 * unless the user turned that on), or a Discard. After the approval the same card follows each reply until posted.
 */
export function FollowUpResult({
  attempt,
  prNumber,
  resolveHumans,
}: {
  attempt: Pick<
    ContributeAttemptDetail,
    'attemptId' | 'state' | 'patch' | 'checkStatus' | 'submit' | 'replyDrafts' | 'approvedAt' | 'updatedAt'
  >;
  prNumber: number | null;
  /** The user's setting; `undefined` while the API does not answer it (people's threads stay open). */
  resolveHumans: boolean | undefined;
}) {
  const router = useRouter();
  const inReview = attempt.state === 'REVIEW';
  const hasCommits = Boolean(attempt.patch?.trim());
  const blocked = hasCommits && attempt.checkStatus?.status === 'BLOCKED';
  // Approved before (a push that came back): the user's own choices; else ours.
  const [edits, setEdits] = useState<Record<string, Edit>>(() =>
    Object.fromEntries(
      (attempt.replyDrafts ?? []).map((draft) => [
        draft.draftId,
        { text: draft.text, send: attempt.approvedAt && draft.send !== undefined ? draft.send : sendsByDefault(draft) },
      ]),
    ),
  );
  const [humans, setHumans] = useState(resolveHumans === true);
  const [confirm, setConfirm] = useState<'push' | 'discard' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settingError, setSettingError] = useState<string | null>(null);
  const [done, setDone] = useState<'push' | 'discard' | null>(null);
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [acting, setActing] = useState<'push' | 'discard' | null>(null);
  // Comments discarded one by one: gone from the card at once (back on a failure); the API drops their replies.
  const [dropped, setDropped] = useState<Set<string>>(() => new Set());
  const [, startDropping] = useTransition();
  const busy = pending || done !== null;
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';

  const drafts = (attempt.replyDrafts ?? []).filter((draft) => !dropped.has(draft.draftId));
  const editOf = (draft: ContributeReplyDraft) => edits[draft.draftId] ?? { text: draft.text, send: false };
  const sent = drafts.filter((draft) => editable(draft) && editOf(draft).send && editOf(draft).text.trim());
  const resolving = sent.filter((draft) => resolvesOf(draft, humans)).length;
  const { bots, people } = threadsByWho(drafts.filter((draft) => draft.comment));
  const comments = drafts.filter((draft) => !draft.comment);

  const push = () =>
    startTransition(async () => {
      setActing('push');
      setError(null);
      const result = await approveFollowUp(
        attempt.attemptId,
        followUpApprovalTitle(prNumber),
        drafts.filter(editable).map((draft) => ({
          draftId: draft.draftId,
          text: editOf(draft).text,
          send: editOf(draft).send && Boolean(editOf(draft).text.trim()),
        })),
      );
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setDone('push');
      setConfirm(null);
      router.refresh();
    });

  const discard = () =>
    startTransition(async () => {
      setActing('discard');
      setError(null);
      const result = await discardAttempt(attempt.attemptId);
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setDone('discard');
      setConfirm(null);
      router.refresh();
    });

  const discardComment = (draft: ContributeReplyDraft) => {
    const commentId = draft.comment?.commentId;
    if (!draft.prId || !commentId) return;
    setError(null);
    setDropped((current) => new Set([...current, draft.draftId]));
    startDropping(async () => {
      const result = await ignoreReviewThreads(draft.prId, [commentId]);
      if (!result.ok) {
        setDropped((current) => new Set([...current].filter((id) => id !== draft.draftId)));
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });
  };

  const toggleHumans = (on: boolean) => {
    setHumans(on);
    setSettingError(null);
    startSaving(async () => {
      const result = await setResolveHumanThreads(on);
      if (!result.ok) {
        setHumans(!on);
        setSettingError('Your choice could not be saved. Try again.');
      }
    });
  };

  const list = (title: string, items: ContributeReplyDraft[]) =>
    items.length ? (
      <div className="flex flex-col overflow-hidden rounded-lg border">
        <h3 className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
          {title} <span className="font-normal text-muted-foreground">· {items.length}</span>
        </h3>
        <ul className="divide-y">
          {items.map((draft) => (
            <ThreadResult
              key={draft.draftId}
              draft={draft}
              edit={editOf(draft)}
              onEdit={(edit) => setEdits((current) => ({ ...current, [draft.draftId]: edit }))}
              readOnly={!inReview || !editable(draft) || busy}
              resolveHumans={humans}
              postLater={
                attempt.state === 'DONE'
                  ? { prNumber, version: [draft.state, draft.updatedAt, attempt.updatedAt].join('|') }
                  : null
              }
              onDiscard={
                inReview && draft.prId && draft.comment && editable(draft) && !busy ? () => discardComment(draft) : null
              }
            />
          ))}
        </ul>
      </div>
    ) : null;

  const pushLabel = hasCommits ? 'Push fixes and reply' : 'Post the replies';
  const summary = [
    hasCommits ? `pushes the new commits to ${pr}` : 'pushes nothing (no commits this round)',
    sent.length ? `posts ${sent.length} ${sent.length === 1 ? 'reply' : 'replies'}` : 'posts no reply',
    resolving ? `resolves ${resolving} ${resolving === 1 ? 'thread' : 'threads'}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  // The push's confirm: what it does, said once more, publicly and in the user's name.
  const pushDialog = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{hasCommits ? `Push the fixes to ${pr}?` : `Post the replies on ${pr}?`}</DialogTitle>
        <DialogDescription>This {summary}, publicly on GitHub in your name.</DialogDescription>
      </DialogHeader>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" onClick={push} disabled={busy}>
          {pending ? 'Pushing…' : pushLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <section data-panel="follow-up-result" className="flex flex-col gap-3.5 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className={HEADING.card}>{inReview ? 'What the agent did' : 'The review comments'}</h2>
      <CheckStatusNote status={attempt.checkStatus} />
      {list('Bots', bots)}
      {list('People', people)}
      {list('Comments on the pull request', comments)}
      {!drafts.length ? <p className="text-sm text-muted-foreground">The agent drafted no reply this round.</p> : null}
      {inReview ? (
        <div className="flex flex-col gap-3 border-t pt-3.5">
          {people.length ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={humans}
                onChange={(event) => toggleHumans(event.target.checked)}
                disabled={busy || saving || resolveHumans === undefined}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Also resolve people&apos;s threads once replied
                <span className="block text-xs text-muted-foreground">
                  Off by default: reviewers usually resolve their own. Saved for your next follow-ups.
                </span>
              </span>
            </label>
          ) : null}
          {settingError ? (
            <span role="alert" className="text-sm text-destructive">
              {settingError}
            </span>
          ) : null}
          {blocked ? (
            <p className="text-sm text-muted-foreground">
              These commits cannot be pushed. Discard them, or answer the threads on GitHub yourself.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Approving {summary}.</p>
          )}
          {error && !confirm ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Dialog open={confirm === 'push'} onOpenChange={(open) => !pending && setConfirm(open ? 'push' : null)}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="lg"
                  disabled={busy || blocked || (!hasCommits && !sent.length)}
                  className="min-h-11 font-semibold"
                >
                  {(pending && acting === 'push') || done === 'push'
                    ? 'Pushing…'
                    : attempt.submit?.lastError
                      ? `${pushLabel} again`
                      : pushLabel}
                </Button>
              </DialogTrigger>
              {pushDialog}
            </Dialog>
            <ConfirmDialog
              trigger={
                <Button type="button" variant="destructive-outline" disabled={busy} className="min-h-11">
                  Discard round
                </Button>
              }
              open={confirm === 'discard'}
              onOpenChange={(open) => setConfirm(open ? 'discard' : null)}
              title="Discard this round?"
              description="Nothing is pushed and no reply is posted. What it cost stays spent; the comments you did not discard stay waiting on the pull request."
              action="Discard round"
              pendingAction="Discarding…"
              pending={pending}
              error={confirm === 'discard' ? error : null}
              onConfirm={discard}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
