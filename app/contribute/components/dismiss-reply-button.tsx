'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { dismissReply } from '../actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ContributeReplyUserDismissReason } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';

/**
 * Dismiss a reply that waits for the user (drafted, or refused by GitHub): it is never posted and no longer counts as
 * something that needs them. The confirm asks why: they posted it on GitHub themselves, or it is not needed.
 */
export function DismissReplyButton({
  draftId,
  label,
  disabled = false,
  onDone,
}: {
  draftId: string;
  /** The button's accessible name: which reply it dismisses. */
  label: string;
  /** Another action on the same reply went through: off until the page reads it again. */
  disabled?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Dismissed: the button stays off until the page reads the draft again. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const dismiss = (reason: ContributeReplyUserDismissReason) =>
    startTransition(async () => {
      setError(null);
      const result = await dismissReply(draftId, reason);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      setOpen(false);
      onDone?.();
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-dismiss-reply={draftId}>
      <Button
        type="button"
        size="lg"
        variant="ghost"
        onClick={() => setOpen(true)}
        disabled={pending || done || disabled}
        aria-label={label}
        className="px-4"
      >
        Dismiss
      </Button>
      {error && !open ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss this reply?</DialogTitle>
            <DialogDescription>
              It is not posted, and it no longer shows as something that needs you. Nothing changes on GitHub.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => dismiss('NOT_NEEDED')} disabled={pending}>
              Not needed
            </Button>
            <Button type="button" onClick={() => dismiss('POSTED_BY_HAND')} disabled={pending}>
              I posted it myself
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
