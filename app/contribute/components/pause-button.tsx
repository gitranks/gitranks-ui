'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { pauseContributing, resumeContributing } from '../actions';
import { Button } from '@/components/ui/button';
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
      <Button
        type="button"
        variant={paused ? 'default' : 'outline'}
        onClick={click}
        disabled={pending}
        data-paused={paused}
        className={paused ? 'min-h-11 px-4 font-semibold' : 'min-h-11 px-4'}
      >
        {pending ? 'Saving…' : paused ? 'Resume contributing' : 'Pause contributing'}
      </Button>
      {error ? (
        <span role="alert" className="max-w-64 text-right text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
