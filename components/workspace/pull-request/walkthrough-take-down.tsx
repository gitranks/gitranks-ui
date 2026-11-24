'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/workspace/confirm-dialog';
import { removeLesson } from '@/lib/learn/actions';
import { contributeErrorMessage } from '@/lib/workspace/errors';

/**
 * "Take the walkthrough down", on a Learn pull request's page: the fixer's public walkthrough goes for good, after a
 * confirmation. Its links then say it was removed by its author; the pull request stays as it is.
 */
export function WalkthroughTakeDown({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeLesson(slug);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" data-take-down="">
      <ConfirmDialog
        trigger={
          <button type="button" className="hover:underline disabled:opacity-50 max-sm:min-h-11" disabled={pending}>
            Take the walkthrough down
          </button>
        }
        open={open}
        onOpenChange={setOpen}
        title="Take this walkthrough down?"
        description="Its links will say it was removed by its author, for good. The pull request stays as it is on GitHub."
        action="Take it down"
        pendingAction="Taking it down…"
        pending={pending}
        error={error}
        onConfirm={confirm}
      />
    </div>
  );
}
