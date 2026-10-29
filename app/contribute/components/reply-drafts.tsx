import Link from 'next/link';

import { ApproveReplyButton } from './approve-reply-button';
import { Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import { githubUrlOf, toneLabelOf } from '@/lib/contribute/attempt-format';
import type { ContributeAttempt, ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { FOLLOW_UP_STATES, REPLY_STATES, replyBlockOf } from '@/lib/contribute/follow-up-format';
import { relativeLabel } from '@/lib/contribute/format';

/** The follow-up that drafted a reply, as far as the page knows it; `patch` only on the follow-up's own page. */
export type DraftFollowUp = Pick<ContributeAttempt, 'attemptId' | 'state'> & { patch?: string | null };

/** `as a reply in the review thread on src/a.ts:12, on pull request #1419`. */
function whereOf(draft: ContributeReplyDraft, prNumber: number | null) {
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  if (!draft.comment) return `as a comment on ${pr}`;
  const { path, line } = draft.comment;
  return `as a reply in the review thread${path ? ` on ${path}${line ? `:${line}` : ''}` : ''}, on ${pr}`;
}

/** One drafted reply: what it answers, its words, and where it stands; Approve while it is not posted. */
export function ReplyDraftItem({
  draft,
  prNumber,
  followUp,
  now,
}: {
  draft: ContributeReplyDraft;
  prNumber: number | null;
  followUp?: DraftFollowUp;
  now?: Date;
}) {
  const state = toneLabelOf(REPLY_STATES, draft.state);
  const postedUrl = githubUrlOf(draft.url);
  const where = whereOf(draft, prNumber);
  const canApprove = draft.state === 'DRAFT' || draft.state === 'FAILED';
  const followUpState = followUp ? FOLLOW_UP_STATES[followUp.state] : undefined;

  return (
    <li
      data-reply-draft={draft.draftId}
      data-reply-state={draft.state}
      className="flex flex-col gap-2.5 border-b px-5 py-4 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <Pill tone={state.tone}>{state.label}</Pill>
        <span>
          {draft.comment ? 'Reply in a review thread' : 'Comment on the pull request'}
          {draft.comment?.path ? (
            <span className="font-mono">
              {' '}
              · {draft.comment.path}
              {draft.comment.line ? `:${draft.comment.line}` : ''}
            </span>
          ) : null}
        </span>
        <span>· drafted {relativeLabel(draft.createdAt, now)}</span>
      </div>
      {draft.comment ? (
        <blockquote
          data-reply-target={draft.comment.commentId}
          className="border-l-2 pl-3 text-sm text-muted-foreground"
        >
          <span className="font-medium text-foreground/80">{draft.comment.author || 'A reviewer'} wrote:</span>{' '}
          <span className="whitespace-pre-line">{draft.comment.excerpt}</span>
        </blockquote>
      ) : null}
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium">The reply, posted in your name</span>
        <p className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-wrap">{draft.text}</p>
      </div>
      {followUp ? (
        <span data-reply-follow-up={followUp.state} className="text-[13px] text-muted-foreground">
          Drafted by a{' '}
          <Link href={attemptHref(followUp.attemptId)} prefetch={false} className="text-primary hover:underline">
            follow-up
          </Link>
          {followUpState ? `: ${followUpState}.` : '.'}
        </span>
      ) : (
        <span className="text-[13px] text-muted-foreground">
          Drafted by a{' '}
          <Link href={attemptHref(draft.attemptId)} prefetch={false} className="text-primary hover:underline">
            follow-up
          </Link>
          .
        </span>
      )}
      {draft.state === 'POSTING' ? (
        <span className="text-sm text-muted-foreground">Posting it on GitHub. This takes a moment.</span>
      ) : null}
      {draft.state === 'POSTED' ? (
        <span className="text-sm">
          Posted {where}, {relativeLabel(draft.postedAt ?? draft.updatedAt, now)}.{' '}
          {postedUrl ? (
            <a href={postedUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary">
              See it on GitHub ↗
            </a>
          ) : null}
        </span>
      ) : null}
      {draft.state === 'FAILED' ? (
        <p
          role="alert"
          data-reply-error={draft.lastError?.reason ?? ''}
          className="text-sm text-amber-900 dark:text-amber-200"
        >
          {draft.lastError?.note || 'It was not posted.'} You can approve it again.
        </p>
      ) : null}
      {canApprove ? (
        <ApproveReplyButton
          draftId={draft.draftId}
          where={where}
          again={draft.state === 'FAILED'}
          blocked={followUp ? replyBlockOf(followUp) : null}
        />
      ) : null}
    </li>
  );
}

/**
 * A pull request's drafted replies, oldest first. Nothing is posted until the user approves a reply. `drafts` is
 * `undefined` while the API does not answer them.
 */
export function ReplyDrafts({
  drafts,
  prNumber,
  followUps,
  now,
  title = 'Replies drafted for you',
}: {
  drafts: ContributeReplyDraft[] | undefined;
  prNumber: number | null;
  /** The follow-ups the page knows, by id, to show each draft's beside it. */
  followUps?: Map<string, DraftFollowUp>;
  now?: Date;
  title?: string;
}) {
  return (
    <section data-panel="replies" className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-1 border-b px-5 py-3.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-[13px] text-muted-foreground">
          Posted on GitHub in your name only if you approve them.
        </span>
      </div>
      {!drafts ? (
        <p data-replies="unavailable" className="px-5 py-4 text-sm text-muted-foreground">
          Reply drafts are not available yet.
        </p>
      ) : drafts.length ? (
        <ul>
          {drafts.map((draft) => (
            <ReplyDraftItem
              key={draft.draftId}
              draft={draft}
              prNumber={prNumber}
              followUp={followUps?.get(draft.attemptId)}
              now={now}
            />
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-sm text-muted-foreground">No replies were drafted.</p>
      )}
    </section>
  );
}
