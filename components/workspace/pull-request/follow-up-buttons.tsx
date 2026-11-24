'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { markNeedsYouHandled } from '@/lib/workspace/actions';
import type { ContributePrSignalKind } from '@/lib/workspace/contribute.types';
import { handledErrorMessage, handledKindsOf } from '@/lib/workspace/follow-up-format';

const ErrorNote = ({ error }: { error: string | null }) =>
  error ? (
    <span role="alert" className="text-sm text-destructive">
      {error}
    </span>
  ) : null;

/**
 * "Mark as handled": the user took care of what the pull request's reads found, so it leaves Needs you. `kinds`: only
 * those ("I've done it" on one card); `all` when they are every signal on it, so an API that does not take `kinds`
 * yet clears the same. Something new on it raises it again. `link`: a small link-like button, under a row's action.
 */
export function MarkHandledButton({
  prId,
  prNumber,
  kinds,
  all = false,
  label = 'Mark as handled',
  look = 'outline',
}: {
  prId: string;
  prNumber?: number;
  kinds?: ContributePrSignalKind[];
  all?: boolean;
  label?: string;
  /** `primary`: the card's main button ("Keep it open"). */
  look?: 'outline' | 'large' | 'link' | 'primary';
}) {
  const router = useRouter();
  const actions = useSessionActions();
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the page reads again. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const off = pending || done || offOf(actions);

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await markNeedsYouHandled(prId, handledKindsOf(kinds, all));
      if (!result.ok) {
        setError(handledErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.refresh();
    });

  const text = pending || done ? 'Marking…' : label;
  const aria = prNumber ? `${label} on pull request #${prNumber}` : undefined;
  return (
    <div
      className={cn('flex flex-col gap-1.5', look === 'link' ? 'items-end max-sm:items-start' : 'items-start')}
      data-mark-handled={prId}
      data-kinds={kinds?.join(',')}
    >
      {look === 'link' ? (
        <button
          type="button"
          onClick={click}
          disabled={off}
          aria-label={aria}
          className="inline-flex min-h-6 items-center text-xs font-semibold text-link hover:underline disabled:opacity-60 max-sm:min-h-11"
        >
          {text}
        </button>
      ) : (
        <Button
          type="button"
          variant={look === 'primary' ? 'default' : 'outline'}
          size={look === 'large' || look === 'primary' ? 'lg' : 'sm'}
          onClick={click}
          disabled={off}
          aria-label={aria}
          className={look === 'large' || look === 'primary' ? 'min-h-11 px-4 font-semibold' : undefined}
        >
          {text}
        </Button>
      )}
      <ErrorNote error={error} />
    </div>
  );
}
