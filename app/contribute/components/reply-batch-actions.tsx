'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import { approveRepliesAsOneComment, approveReply, dismissReply } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { CopyButton } from './copy-button';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import type { ContributeReplyBatch, ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { whereOfThread } from '@/lib/contribute/follow-up-flow';
import { partOf, previewOf, requestKeyOf } from '@/lib/contribute/one-comment';
import { replyCopyOf } from '@/lib/contribute/org-access';
import { runBatch } from '@/lib/contribute/session-head-logic';

/**
 * The replies-not-posted and replies-left-out cards' controls over several replies: copy them all, dismiss them, post
 * them again, post them, or post them as one comment (and try a failed comment again). Each but the one comment runs
 * one action per reply in turn; a partial failure stays in the card with what is left.
 */

const BIG = 'min-h-11 px-4 font-semibold';

const ErrorLine = ({ text }: { text: string | null | undefined }) =>
  text ? (
    <p role="alert" className="text-sm text-destructive" data-move-error="">
      {text}
    </p>
  ) : null;

/** "maintainer-mo on normalize-path.ts:3:", then the reply's words: one block per reply, to post by hand. */
const copyAllTextOf = (drafts: ContributeReplyDraft[]) => {
  const blocks = drafts.flatMap((draft) => {
    const { words, copyable } = replyCopyOf(draft);
    if (!copyable || !words.trim()) return [];
    const who = draft.comment ? (draft.comment.author ?? 'A reviewer') : 'On the pull request';
    const where = draft.comment ? whereOfThread(draft.comment) : '';
    return [`${who}${where ? ` on ${where}` : ''}:\n${words.trim()}`];
  });
  return { text: blocks.join('\n\n'), count: blocks.length };
};

/** Copy all N: every reply's words with where it goes, to post on GitHub by hand. */
export function CopyAll({ drafts, primary }: { drafts: ContributeReplyDraft[]; primary: boolean }) {
  const actions = useSessionActions();
  const { text, count } = copyAllTextOf(drafts);
  if (!count) return null;
  return (
    <CopyButton
      text={text}
      label={count === drafts.length ? `Copy all ${count}` : `Copy ${count} of ${drafts.length}`}
      variant={primary ? 'default' : 'outline'}
      disabled={offOf(actions)}
      className={BIG}
    />
  );
}

/** One action over several replies, from its confirm; a partial failure stays in the card with what is left. */
function Several({
  ids,
  trigger,
  title,
  description,
  action,
  pendingAction,
  verb,
  call,
  variant,
}: {
  ids: string[];
  trigger: (props: { disabled: boolean }) => ReactNode;
  title: string;
  description: string;
  action: string;
  pendingAction: string;
  verb: 'Dismissed' | 'Posted';
  call: (id: string) => ReturnType<typeof approveReply>;
  variant: 'default' | 'destructive';
}) {
  const actions = useSessionActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [left, setLeft] = useState(ids);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <ConfirmDialog
        trigger={trigger({ disabled: pending || offOf(actions) }) as never}
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        action={action}
        pendingAction={pendingAction}
        pending={pending}
        actionVariant={variant}
        onConfirm={() =>
          startTransition(async () => {
            // The replies still to do: those of a fresh read the last run left (or every one, the first time).
            const list = left.filter((id) => ids.includes(id));
            const result = await runBatch(list.length ? list : ids, call, verb);
            setLine(result.line);
            setLeft(result.failed);
            setOpen(false);
            router.refresh();
          })
        }
      />
      <ErrorLine text={line} />
    </div>
  );
}

/** Dismiss several replies: each is never posted and no longer waits for the user. */
export function DismissSeveral({ ids }: { ids: string[] }) {
  return (
    <Several
      ids={ids}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant="outline" disabled={disabled} className={BIG}>
          Dismiss
        </Button>
      )}
      title={ids.length === 1 ? 'Dismiss this reply?' : `Dismiss these ${ids.length} replies?`}
      description="They are not posted, and no longer show as something that needs you. Nothing changes on GitHub."
      action="Dismiss"
      pendingAction="Dismissing…"
      verb="Dismissed"
      call={(id) => dismissReply(id, 'NOT_NEEDED') as never}
      variant="destructive"
    />
  );
}

/** Try all again: the replies a retry can mend, posted again, each as it went before (in its thread, or as a comment). */
export function RetrySeveral({ drafts }: { drafts: ContributeReplyDraft[] }) {
  const comment = new Set(drafts.filter((draft) => draft.asComment === true).map(({ draftId }) => draftId));
  return (
    <Several
      ids={drafts.map(({ draftId }) => draftId)}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant="outline" disabled={disabled} className={BIG}>
          Try all again
        </Button>
      )}
      title={`Post these ${drafts.length} replies again?`}
      description="Each is posted publicly on GitHub in your name, where it went before."
      action="Post them"
      pendingAction="Posting…"
      verb="Posted"
      call={(id) => approveReply(id, comment.has(id))}
      variant="default"
    />
  );
}

/** Post the replies left out of a push: each with words is posted, in turn. */
export function PostSeveral({
  drafts,
  prNumber,
  primary,
}: {
  drafts: ContributeReplyDraft[];
  prNumber: number | null;
  primary: boolean;
}) {
  const ready = drafts.filter((draft) => draft.text.trim());
  if (!ready.length) return null;
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';
  return (
    <Several
      ids={ready.map(({ draftId }) => draftId)}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant={primary ? 'default' : 'outline'} disabled={disabled} className={BIG}>
          {ready.length === 1 ? 'Post the reply' : `Post ${ready.length} replies`}
        </Button>
      )}
      title={ready.length === 1 ? `Post the reply on ${pr}?` : `Post ${ready.length} replies on ${pr}?`}
      description="Each is posted publicly on GitHub in your name, with the words as drafted."
      action="Post them"
      pendingAction="Posting…"
      verb="Posted"
      call={(id) => approveReply(id, false)}
      variant="default"
    />
  );
}

/** Copy all N: the run's replies not posted, as the one comment's text (each quotes and links its thread). */
export function CopyAllBodies({ text, count, primary }: { text: string; count: number; primary: boolean }) {
  const actions = useSessionActions();
  return (
    <CopyButton
      text={text}
      label={`Copy all ${count}`}
      variant={primary ? 'default' : 'outline'}
      disabled={offOf(actions)}
      className={BIG}
    />
  );
}

/** The one comment as it will read on GitHub: each part under its number when it is split. */
function CommentPreview({ bodies }: { bodies: readonly string[] }) {
  return (
    <div
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region, reachable by keyboard to read it all
      tabIndex={0}
      role="region"
      aria-label="The comment as it will post"
      data-one-comment-preview=""
      className="flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/60 p-3 text-foreground"
    >
      {previewOf(bodies).map(({ title, body }, index) => (
        <div key={index} className="flex flex-col gap-1">
          {title ? <p className="text-xs font-medium text-muted-foreground">{title}</p> : null}
          <pre className="font-mono text-xs break-words whitespace-pre-wrap">{body}</pre>
        </div>
      ))}
    </div>
  );
}

/** The replies that go, one line each (whom each answers, and where), when the comment's text is not known for them. */
function RepliesGoing({ drafts }: { drafts: ContributeReplyDraft[] }) {
  return (
    <ul data-one-comment-replies="" className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm">
      {drafts.map((draft) => {
        const where = draft.comment ? whereOfThread(draft.comment) : '';
        return (
          <li key={draft.draftId} className="break-words">
            {draft.comment ? (draft.comment.author ?? 'A reviewer') : 'On the pull request'}
            {where ? ` on ${where}` : ''}: {draft.text.trim()}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One click's key, kept until the click has a clear answer: a call whose answer was lost goes again with the same key,
 * so it never posts twice. A clear answer (done, or refused) takes a fresh key for the next click.
 */
function useRequestKey() {
  const [key, setKey] = useState(() => requestKeyOf());
  return { key, renew: () => setKey(requestKeyOf()) };
}

/** Posts the replies as one comment (or tries a failed comment again) from its confirm; the confirm shows why it failed. */
function OneCommentAction({
  attemptId,
  target,
  trigger,
  title,
  description,
  bodies,
  replies,
  action,
}: {
  attemptId: string;
  target: { draftIds: string[] } | { batchId: string };
  trigger: (props: { disabled: boolean }) => ReactNode;
  title: string;
  description: string;
  /** What goes: the comment's text, when it is known before it is sent. */
  bodies: readonly string[] | null;
  /** Else the replies that go, by whom they answer and where. */
  replies?: ContributeReplyDraft[] | null;
  action: string;
}) {
  const actions = useSessionActions();
  const router = useRouter();
  const { key, renew } = useRequestKey();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmDialog
      trigger={trigger({ disabled: pending || offOf(actions) }) as never}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
      title={title}
      description={description}
      body={
        bodies?.length ? <CommentPreview bodies={bodies} /> : replies?.length ? <RepliesGoing drafts={replies} /> : null
      }
      action={action}
      pendingAction="Posting…"
      pending={pending}
      error={error}
      actionVariant="default"
      onConfirm={() =>
        startTransition(async () => {
          const result = await approveRepliesAsOneComment(attemptId, target, key).catch(() => null);
          // Only an answer that says what happened takes a new key; a lost one is sent again as it was.
          if (!result) {
            setError(
              "GitRanks couldn't be reached, so the comment may not have gone. Check your connection, then post again.",
            );
            return;
          }
          if (result.ok || result.error !== 'FAILED') renew();
          if (!result.ok) {
            setError(
              result.error === 'NOT_FOUND'
                ? 'These replies are gone, or no longer yours. Reload the page.'
                : contributeErrorMessage(result.error, result.message),
            );
            return;
          }
          setOpen(false);
          router.refresh();
        })
      }
    />
  );
}

/** "Post them as one comment on #N": the replies GitHub kept out of their threads, quoted and linked, in one comment. */
export function PostAsOneComment({
  attemptId,
  draftIds,
  bodies,
  drafts,
  prNumber,
  primary,
}: {
  attemptId: string;
  draftIds: string[];
  /** The comment's text; empty when it is not known for exactly these replies (they are listed then). */
  bodies: string[];
  drafts: ContributeReplyDraft[];
  prNumber: number | null;
  primary: boolean;
}) {
  const one = draftIds.length === 1;
  const pr = prNumber ? `#${prNumber}` : 'the pull request';
  const label = one ? `Post it as a comment on ${pr}` : `Post them as one comment on ${pr}`;
  return (
    <OneCommentAction
      attemptId={attemptId}
      target={{ draftIds }}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant={primary ? 'default' : 'outline'} disabled={disabled} className={BIG}>
          {label}
        </Button>
      )}
      title={one ? `Post the reply as a comment on ${pr}?` : `Post ${draftIds.length} replies as one comment on ${pr}?`}
      description={`It is posted publicly on GitHub in your name. ${one ? 'It quotes the review comment and links its thread, then gives your reply' : 'It quotes each review comment and links its thread, then gives your reply'}${bodies.length > 1 ? `, in ${bodies.length} comments, as GitHub limits a comment's length` : ''}:`}
      bodies={bodies}
      replies={bodies.length ? null : drafts}
      action={one ? 'Post the comment' : 'Post as one comment'}
    />
  );
}

/** Try again on a comment that failed: sent again exactly as before, or built again from the replies still failed. */
export function TryCommentAgain({
  attemptId,
  batch,
  count,
  primary,
}: {
  attemptId: string;
  batch: Pick<ContributeReplyBatch, 'batchId' | 'retry' | 'part' | 'parts'>;
  /** Its replies still failed. */
  count: number;
  primary: boolean;
}) {
  const part = partOf(batch);
  const resend = batch.retry === 'RESEND';
  return (
    <OneCommentAction
      attemptId={attemptId}
      target={{ batchId: batch.batchId }}
      trigger={({ disabled }) => (
        <Button type="button" size="lg" variant={primary ? 'default' : 'outline'} disabled={disabled} className={BIG}>
          {part ? `Try ${part.toLowerCase()} again` : 'Try again'}
        </Button>
      )}
      title={part ? `Try ${part.toLowerCase()} of the comment again?` : 'Try the comment again?'}
      description={
        resend
          ? 'It is sent again exactly as before, in your name. If GitHub has it already, it is not posted twice.'
          : `The ${count === 1 ? 'reply' : `${count} replies`} still not posted go as a new comment, in your name.`
      }
      bodies={null}
      action="Try again"
    />
  );
}
