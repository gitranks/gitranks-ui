'use client';

import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { ApproveReplyButton } from './approve-reply-button';
import { DismissReplyButton } from './dismiss-reply-button';
import { offOf, useSessionActions } from './session-actions';
import { useGrantGithub } from './use-grant-github';
import { Button } from '@/components/ui/button';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import type { rowActionsOf } from '@/lib/contribute/review-comments';

/** "Allow GitHub access again": GitHub's consent, back to this page, where the reply can be tried again. */
function GrantAgain() {
  const actions = useSessionActions();
  const { grant, pending } = useGrantGithub((usePathname() || '/contribute') as Route);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={grant}
      disabled={pending || offOf(actions)}
      className="min-h-11 px-4 font-semibold max-sm:w-full sm:min-h-9"
    >
      {pending ? 'Opening GitHub…' : 'Allow GitHub access again'}
    </Button>
  );
}

/**
 * What an opened row offers for its reply: post it (or again, or as a comment instead), ask for GitHub access, dismiss
 * it, or leave its comment out of this run. Once one went through, the others stay off until the page reads the row
 * again (`version`).
 */
export function CommentRowActions({
  draft,
  actions: offered,
  version,
  where,
  commentWhere,
  who,
}: {
  draft: ContributeReplyDraft;
  actions: ReturnType<typeof rowActionsOf>;
  /** What the page last read of the reply and its run (`rowVersionOf`). */
  version: string;
  /** Where posting puts it: `as a reply in the review thread on src/a.ts:3, on pull request #12`. */
  where: string;
  /** Where it goes as a comment: `as a comment on pull request #12`. */
  commentWhere: string;
  /** Whom the reply answers, for the buttons' names. */
  who: string;
}) {
  const session = useSessionActions();
  const [acted, setActed] = useState(false);
  const [seen, setSeen] = useState(version);
  if (seen !== version) {
    setSeen(version);
    setActed(false);
  }
  const done = () => setActed(true);
  const post = offered.post;
  const discarding = session?.replies?.discarding.has(draft.draftId) ?? false;
  if (!post && !offered.dismiss && !offered.discard) return null;

  return (
    <div
      className="flex flex-wrap items-start gap-2 max-sm:flex-col max-sm:items-stretch"
      data-row-actions={draft.draftId}
    >
      {post?.kind === 'post' ? (
        <ApproveReplyButton draftId={draft.draftId} where={where} version={version} disabled={acted} onDone={done} />
      ) : null}
      {post?.kind === 'retry' ? (
        <ApproveReplyButton
          draftId={draft.draftId}
          where={post.asComment ? commentWhere : where}
          version={version}
          again
          asComment={post.asComment}
          disabled={acted}
          onDone={done}
        />
      ) : null}
      {post?.kind === 'as-comment' ? (
        <ApproveReplyButton
          draftId={draft.draftId}
          where={commentWhere}
          version={version}
          asComment
          instead
          disabled={acted}
          onDone={done}
        />
      ) : null}
      {post?.kind === 'grant' ? <GrantAgain /> : null}
      {offered.dismiss ? (
        <DismissReplyButton
          draftId={draft.draftId}
          label={`Dismiss the reply to ${who}`}
          disabled={acted || offOf(session)}
          onDone={done}
        />
      ) : null}
      {offered.discard ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => session?.replies?.discardComment(draft.draftId)}
          disabled={!session?.replies || discarding || offOf(session)}
          aria-label={`Discard the comment of ${who}: no reply, and left out until someone comments on it again`}
          className="min-h-11 sm:min-h-9"
        >
          Discard comment
        </Button>
      ) : null}
    </div>
  );
}
