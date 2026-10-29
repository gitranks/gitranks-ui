'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { pauseContributing, resumeContributing } from '../actions';
import { contributeErrorMessage } from '@/lib/contribute/errors';

/** Pauses new attempts, or resumes them. */
export function PauseButton({ paused }: { paused: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await (paused ? resumeContributing() : pauseContributing());
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        data-paused={paused}
        className={
          paused
            ? 'min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50'
            : 'min-h-11 rounded-lg border bg-background px-4 font-medium hover:bg-accent disabled:opacity-50'
        }
      >
        {pending ? 'Saving…' : paused ? 'Resume contributing' : 'Pause contributing'}
      </button>
      {error ? (
        <span role="alert" className="max-w-64 text-right text-sm text-red-700 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
