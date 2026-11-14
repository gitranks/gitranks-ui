'use client';

import Link from 'next/link';

import { CommentRowActions } from './comment-row-actions';
import { OrgAccessLink, ReplyCopyBar, ReplyText } from './reply-text';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import { editAfterTyping } from '@/lib/contribute/comment-actions';
import type { ContributeFeedbackThread, ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { whereOfThread } from '@/lib/contribute/follow-up-flow';
import { isOrgRestricted, type OrgAccess, replyLinkOf } from '@/lib/contribute/org-access';
import { reasonKeyOf } from '@/lib/contribute/reply-trouble';
import type { RowState, rowActionsOf } from '@/lib/contribute/review-comments';
import { sessionPath } from '@/lib/contribute/sessions';

const REASON_LABELS = {
  FIXED: "Why it's fixed: ",
  SKIPPED: 'Why not changed: ',
  NEEDS_YOU: 'Question for you: ',
} as const;

const ExternalLink = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="self-start text-sm font-semibold text-link">
    {children}
    <span className="sr-only"> (opens in a new tab)</span>
  </a>
);

/** A waiting thread opened: its path and comment in full, and the way to it on GitHub. */
export function ThreadOpen({ thread }: { thread: ContributeFeedbackThread }) {
  const url = githubUrlOf(thread.url);
  return (
    <div className="flex flex-col gap-2 pb-1">
      {thread.path ? (
        <span className="font-mono text-xs break-all text-muted-foreground">{whereOfThread(thread)}</span>
      ) : null}
      <blockquote className="border-l-2 pl-3 text-sm break-words whitespace-pre-line text-muted-foreground">
        {thread.excerpt}
      </blockquote>
      {url ? <ExternalLink href={url}>On GitHub ↗</ExternalLink> : null}
    </div>
  );
}

/**
 * A reply's row opened: the path and comment in full, the agent's reason, the reply (its editor in a review), the
 * note of a failure no other reply of its run shares, and what can still be done with it.
 */
export function DraftOpen({
  draft,
  state,
  editing,
  actions,
  version,
  prNumber,
  orgAccess,
  firstId,
  resolveSaid,
}: {
  draft: ContributeReplyDraft;
  state: RowState;
  /** In a run's review, its reply is edited here (not under a stop on the push). */
  editing: boolean;
  actions: ReturnType<typeof rowActionsOf> | null;
  version: string;
  prNumber: number | null;
  orgAccess: OrgAccess;
  /** On the first attempt: its id, for the link to the reply's run. */
  firstId: string | null;
  /** A shared resolve failure the Posted group says once. */
  resolveSaid: boolean;
}) {
  const session = useSessionActions();
  const comment = draft.comment;
  const where = comment ? whereOfThread(comment) : '';
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  const who = comment ? `${comment.author || 'a reviewer'}${where ? ` on ${where}` : ''}` : 'the pull request';
  const fieldId = `reply-${draft.draftId}`;
  const prefix = (draft.prefix ?? '').replace('<commit>', 'the new commit').trim();
  const edit = session?.replies?.edits[draft.draftId] ?? { text: draft.text, send: false };
  const copyLabel = comment ? `Copy the reply to ${who}` : `Copy the comment on ${pr}`;
  const postedUrl = githubUrlOf(draft.url);
  const own = state === 'not-posted-own' || (state === 'resolve-failed' && !resolveSaid);
  const reason = reasonKeyOf(draft);
  const link = !draft.text.trim() ? replyLinkOf(draft) : null;

  return (
    <div className="flex flex-col gap-2.5 pb-1">
      {where ? <span className="font-mono text-xs break-all text-muted-foreground">{where}</span> : null}
      {comment ? (
        <blockquote className="border-l-2 pl-3 text-sm break-words whitespace-pre-line text-muted-foreground">
          {comment.excerpt}
        </blockquote>
      ) : null}
      {draft.reason && draft.outcome ? (
        <p className="text-sm">
          <span className="font-medium">{REASON_LABELS[draft.outcome]}</span>
          <span className="break-words">{draft.reason}</span>
        </p>
      ) : null}
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-xs font-medium">
            Reply, posted in your name{prefix ? ` after “${prefix}”` : ''}
            <span className="sr-only"> (to {who})</span>
          </label>
          <Textarea
            id={fieldId}
            value={edit.text}
            onChange={(event) => session?.replies?.setEdit(draft.draftId, editAfterTyping(edit, event.target.value))}
            disabled={offOf(session)}
            rows={2}
            placeholder={draft.outcome === 'NEEDS_YOU' ? 'Write your answer, or leave it for GitHub' : undefined}
            className="min-h-16 text-sm"
          />
          {draft.state === 'FAILED' ? <ReplyCopyBar draft={draft} text={edit.text} label={copyLabel} /> : null}
        </div>
      ) : draft.text.trim() ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">Your reply</span>
          <ReplyText draft={draft} label={copyLabel} />
        </div>
      ) : state === 'no-reply' ? (
        <p className="text-sm text-muted-foreground">No reply was written. Dismiss it if none is needed.</p>
      ) : null}
      {link ? <ExternalLink href={link.href}>{link.label}</ExternalLink> : null}
      {draft.state === 'POSTED' && postedUrl ? (
        state === 'posted-one-comment' ? (
          <Button asChild variant="link" className="h-auto self-start p-0 max-sm:min-h-11">
            <a href={postedUrl} target="_blank" rel="noopener noreferrer" data-one-comment-link="">
              See the comment on GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        ) : (
          <ExternalLink href={postedUrl}>See it on GitHub ↗</ExternalLink>
        )
      ) : null}
      {state === 'waits-for-probe' ? (
        <p className="text-sm text-muted-foreground">
          It goes with the run&apos;s first reply: in its thread if that one gets through; if the organization blocks
          it, in one comment with the others.
        </p>
      ) : null}
      {own ? (
        <p role="alert" data-reply-error={reason} className="text-sm break-words text-warning">
          {draft.lastError?.note?.trim() ||
            (state === 'resolve-failed' ? 'GitHub did not resolve the thread.' : 'It was not posted.')}
        </p>
      ) : null}
      {own && state === 'not-posted-own' && isOrgRestricted(reason) ? <OrgAccessLink access={orgAccess} /> : null}
      {actions ? (
        <CommentRowActions
          draft={draft}
          actions={actions}
          version={version}
          where={
            comment
              ? `as a reply in the review thread${where ? ` on ${where}` : ''}, on ${pr}`
              : `as a comment on ${pr}`
          }
          commentWhere={`as a comment on ${pr}`}
          who={comment ? comment.author || 'a reviewer' : 'the pull request'}
        />
      ) : null}
      {firstId ? (
        <Link
          href={sessionPath(firstId, draft.attemptId)}
          prefetch={false}
          className="self-start text-sm font-semibold text-link"
        >
          From a run →
        </Link>
      ) : null}
    </div>
  );
}
