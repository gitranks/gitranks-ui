'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { resumeContributing } from '@/lib/workspace/actions';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';

/**
 * "Contributing is paused", with Resume: while the user's own pause holds (there is no Pause any more, so this is the
 * way out of one set before). The Contribute tab's list says it over its rows, the Agent tab over the hosted agent's
 * levels. `text` is the place's sentence; `name` marks the place.
 */
export function PausedNotice({ text, name, id }: { text: string; name: string; id?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resume = () => {
    if (pending) return;
    startTransition(async () => {
      setError(null);
      const result = await resumeContributing().catch(() => null);
      if (result?.ok) router.refresh();
      else setError(contributeErrorMessage(result?.error ?? 'FAILED', result?.message));
    });
  };
  return (
    <div
      id={id}
      role="status"
      data-list-note={name}
      className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3"
    >
      <p className="max-w-prose text-sm font-medium">{text}</p>
      <Button
        type="button"
        onClick={resume}
        aria-disabled={pending || undefined}
        className="min-h-11 px-5 font-semibold max-sm:w-full sm:min-h-10 aria-disabled:opacity-60"
      >
        {pending ? 'Resuming…' : 'Resume'}
      </Button>
      {error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Resume while the user's own pause holds (`pausedByYou`, never a refused key's pause): over the hosted agent's levels,
 * alone on the Agent tab without a key, and on Settings, where an agent's "resume it at …" link lands. `anchor`: it
 * takes the old `#pause` link's place (`#hosted-level`) where the levels are not drawn.
 */
export function PausedByYouNotice({ view, anchor = false }: { view: ContributeView; anchor?: boolean }) {
  return view.pausedByYou ? (
    <PausedNotice
      id={anchor ? 'hosted-level' : undefined}
      name="paused-by-you"
      text="Contributing is paused, so your own agent can't take an issue."
    />
  ) : null;
}
