'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import { approveReply, dismissReply } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { CopyButton } from './copy-button';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { whereOfThread } from '@/lib/contribute/follow-up-flow';
import { replyCopyOf } from '@/lib/contribute/org-access';
import { runBatch } from '@/lib/contribute/session-head-logic';

/**
 * The replies-not-posted and replies-left-out cards' controls over several replies: copy them all, dismiss them, post
 * them again, post them. Each runs one action per reply in turn; a partial failure stays in the card with what is left.
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
            const result = await runBatch(left, call, verb);
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
