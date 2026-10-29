'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { approveAttempt, discardAttempt } from '../actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';
import { followUpApprovalTitle } from '@/lib/contribute/follow-up-format';

type Confirm = 'approve' | 'discard' | null;

/**
 * A follow-up in review: push its commits onto the pull request, or discard them. A follow-up opens no pull request,
 * so there is no title or description to edit: the commits are signed off like the pull request's were.
 */
export function FollowUpApproval({
  attemptId,
  prNumber,
  hasCommits,
  again,
}: {
  attemptId: string;
  /** The pull request it follows up; null while it is not known. */
  prNumber: number | null;
  /** The follow-up made commits; without any, approving finishes it with its replies alone. */
  hasCommits: boolean;
  /** A push that went wrong, so this approval is a second one. */
  again: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';

  const act = (which: Exclude<Confirm, null>) =>
    startTransition(async () => {
      setError(null);
      const result =
        which === 'approve'
          ? await approveAttempt({ id: attemptId, title: followUpApprovalTitle(prNumber), body: '', dco: false })
          : await discardAttempt(attemptId);
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setConfirm(null);
      router.refresh();
    });

  return (
    <section
      data-follow-up-approval={attemptId}
      className="flex flex-col gap-3 rounded-xl border-[1.5px] border-primary bg-card p-4.5"
    >
      <h2 className="text-[15px] font-semibold">{hasCommits ? `Push to ${pr}` : 'Finish this follow-up'}</h2>
      <p className="text-[13px] text-muted-foreground">
        {hasCommits
          ? `The new commits go onto ${pr}'s branch on your fork, in your name, signed off as its first commits were. The pull request shows them at once.`
          : 'The agent made no commits this round, only the replies below. Finish it, then approve the replies you want posted.'}
      </p>
      {error && !confirm ? (
        <span role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => setConfirm('approve')}
        disabled={pending}
        className="min-h-[46px] rounded-[10px] bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {hasCommits ? (again ? 'Push again' : 'Push the commits') : 'Finish the follow-up'}
      </button>
      <button
        type="button"
        onClick={() => setConfirm('discard')}
        disabled={pending}
        className="min-h-[42px] rounded-[10px] border bg-background text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Discard
      </button>

      <Dialog open={confirm !== null} onOpenChange={(open) => !pending && !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'discard'
                ? 'Discard this follow-up?'
                : hasCommits
                  ? `Push the commits to ${pr}?`
                  : 'Finish this follow-up?'}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'discard'
                ? 'Nothing is pushed, and replies about its commits cannot be posted. What it cost stays spent.'
                : hasCommits
                  ? `They are pushed publicly to ${pr} on GitHub, in your name.`
                  : 'Nothing is pushed. Its replies are posted only once you approve each one.'}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirm(null)} disabled={pending}>
              Cancel
            </Button>
            {confirm === 'discard' ? (
              <Button type="button" variant="destructive" onClick={() => act('discard')} disabled={pending}>
                {pending ? 'Discarding…' : 'Discard'}
              </Button>
            ) : (
              <Button type="button" onClick={() => act('approve')} disabled={pending}>
                {pending ? 'Pushing…' : hasCommits ? 'Push' : 'Finish'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
