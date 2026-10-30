'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { approveReply } from '../actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { replyRefusalOf } from '@/lib/contribute/follow-up-format';

/**
 * Approve a drafted reply, after a confirm that it is posted publicly on GitHub in the user's name: `approveReply` is
 * called from the confirm alone. `blocked` is why it cannot be posted yet, when that is known before asking; a refusal
 * that approving again cannot mend blocks it too, until `version` (what the page last read of the draft and its
 * follow-up) changes, so pushed commits lift it.
 */
export function ApproveReplyButton({
  draftId,
  where,
  again,
  blocked,
  version,
}: {
  draftId: string;
  /** Where it is posted: `as a reply in the review thread on PR #12`. */
  where: string;
  /** A post that failed: this approval is a second one. */
  again: boolean;
  blocked: string | null;
  /** Changes whenever the page reads the draft or its follow-up anew. */
  version: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  /** Approved: the button stays off until the page reads the draft again. */
  const [done, setDone] = useState(false);
  const [seen, setSeen] = useState(version);
  const [pending, startTransition] = useTransition();
  if (seen !== version) {
    // Fresh data: a refusal of the last read, and the wait for this one, no longer stand.
    setSeen(version);
    setRefused(null);
    setDone(false);
  }
  const stop = blocked ?? refused;

  const approve = () =>
    startTransition(async () => {
      setError(null);
      const result = await approveReply(draftId);
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
      router.refresh();
    });

  return (
    <div
      className="flex flex-col items-start gap-1.5"
      data-approve-reply={draftId}
      data-blocked={stop ? 'true' : 'false'}
    >
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen(true)}
        disabled={pending || done || !!stop}
        className="px-4 font-semibold"
      >
        {again ? 'Approve again' : 'Approve and post'}
      </Button>
      {stop ? (
        <span role="status" data-reply-blocked className="text-sm text-warning">
          {stop}
        </span>
      ) : null}
      {error && !open ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post this reply on GitHub?</DialogTitle>
            <DialogDescription>
              It is posted publicly {where}, in your name, with the words as drafted. Anyone can read it there.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={approve} disabled={pending}>
              {pending ? 'Posting…' : 'Post it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
