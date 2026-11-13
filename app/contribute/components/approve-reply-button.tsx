'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { approveReply } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { replyRefusalOf } from '@/lib/contribute/follow-up-format';

/**
 * Post a reply, after a confirm that it is posted publicly on GitHub in the user's name: `approveReply` is called from
 * the confirm alone. `again`: a post that failed, tried again. `asComment`: a reply GitHub refused in its review thread,
 * posted as a comment on the pull request instead (its first line links the review comment), or a comment that failed
 * as one, tried again as one. A refusal that posting again cannot mend takes the button's place until `version` (what
 * the page last read of the reply and its run) changes. An outline button: the view's one primary is the move card's.
 */
export function ApproveReplyButton({
  draftId,
  where,
  again = false,
  version,
  asComment = false,
  instead = false,
  disabled = false,
  onDone,
}: {
  draftId: string;
  /** Where it is posted: `as a reply in the review thread on PR #12`. */
  where: string;
  again?: boolean;
  /** Changes whenever the page reads the draft or its run anew. */
  version: string;
  /** Post it as a comment on the pull request. */
  asComment?: boolean;
  /** "Post as a comment instead": a reply refused in its thread, offered as a comment. */
  instead?: boolean;
  /** Another action on the same reply went through: off until the page reads it again. */
  disabled?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const actions = useSessionActions();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  /** Posted: the button stays off until the page reads the draft again. */
  const [done, setDone] = useState(false);
  const [seen, setSeen] = useState(version);
  const [pending, startTransition] = useTransition();
  if (seen !== version) {
    // Fresh data: a refusal of the last read, and the wait for this one, no longer stand.
    setSeen(version);
    setRefused(null);
    setDone(false);
  }

  const approve = () =>
    startTransition(async () => {
      setError(null);
      const result = await approveReply(draftId, asComment);
      if (!result.ok) {
        const refusal = replyRefusalOf(result.error, result.message);
        if (refusal.final) {
          setRefused(refusal.text);
          setOpen(false);
        } else {
          setError(refusal.text);
        }
        return;
      }
      setDone(true);
      setOpen(false);
      onDone?.();
      router.refresh();
    });

  if (refused) {
    return (
      <p role="status" data-reply-blocked data-approve-reply={draftId} className="text-sm text-warning">
        {refused}
      </p>
    );
  }

  const label = instead ? 'Post as a comment instead' : again ? 'Try again' : 'Post this reply';
  return (
    <div className="flex flex-col items-start gap-1.5 max-sm:w-full" data-approve-reply={draftId}>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            disabled={pending || done || disabled || offOf(actions)}
            className="min-h-11 px-4 font-semibold max-sm:w-full sm:min-h-9"
          >
            {label}
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
        title={instead ? 'Post it as a comment instead?' : 'Post this reply on GitHub?'}
        description={
          instead
            ? `GitHub did not let it into the review thread. It is posted publicly ${where}, in your name, starting with a link to the review comment it answers. The thread itself stays as it is.`
            : `It is posted publicly ${where}, in your name, with the words as drafted. Anyone can read it there.`
        }
        action="Post it"
        pendingAction="Posting…"
        pending={pending}
        error={error}
        onConfirm={approve}
        actionVariant="default"
      />
      {error && !open ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
