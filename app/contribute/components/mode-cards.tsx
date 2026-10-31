'use client';

import { Check, Globe, Layers, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { setContributeMode } from '../actions';
import type { SetWrite } from './set-section';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ContributeSet, ContributeSetMode } from '@/lib/contribute/contribute.types';
import { MODES } from '@/lib/contribute/set-format';
import { switchPathOf } from '@/lib/contribute/settings-paths';
import { keptListOf } from '@/lib/contribute/settings-summary';
import { cn } from '@/lib/utils';

const ICONS = { STACK: Layers, REPOS: LayoutGrid, ALL: Globe } as const;

const CARD =
  'flex h-full w-full flex-col items-start gap-1.5 rounded-xl border px-4 py-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4';

/**
 * The three modes as cards, the current one filled. Picking a mode with a list opens its guided switch; All issues,
 * which has no list, asks once and switches.
 */
export function ModeCards({ set, write }: { set: ContributeSet; write: SetWrite }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const kept = keptListOf(set);

  const switchToAll = () =>
    startTransition(async () => {
      const failure = await write(() => setContributeMode('ALL'), 'change');
      setError(failure);
      if (!failure) setConfirming(false);
    });

  const body = (mode: ContributeSetMode, on: boolean) => {
    const entry = MODES.find((each) => each.mode === mode) ?? MODES[0];
    const Icon = ICONS[mode];
    return (
      <>
        <span className="flex w-full items-center gap-2 text-sm font-semibold">
          <Icon aria-hidden="true" className={cn('size-4', !on && 'text-muted-foreground')} />
          {entry.title}
          {on ? <Check aria-hidden="true" className="ml-auto size-4" /> : null}
        </span>
        <span className={cn('text-xs max-sm:hidden', on ? 'opacity-80' : 'text-muted-foreground')}>{entry.text}</span>
        <span className={cn('text-xs font-medium sm:mt-auto sm:pt-1', on ? '' : 'text-link')}>
          {on ? 'Current' : 'Switch…'}
        </span>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Where your issues come from" className="grid gap-2.5 sm:grid-cols-3">
        {MODES.map(({ mode, title }) => (
          <li key={mode} data-mode={mode} data-current={mode === set.mode || undefined}>
            {mode === set.mode ? (
              <div aria-current="true" className={cn(CARD, 'border-primary bg-brand-soft text-brand-soft-foreground')}>
                {body(mode, true)}
              </div>
            ) : mode === 'ALL' ? (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirming(true);
                }}
                aria-label={`Switch to ${title}`}
                className={cn(CARD, 'hover:bg-muted/60')}
              >
                {body(mode, false)}
              </button>
            ) : (
              <Link
                href={switchPathOf(mode)}
                prefetch={false}
                aria-label={`Switch to ${title}`}
                className={cn(CARD, 'hover:bg-muted/60')}
              >
                {body(mode, false)}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={confirming} onOpenChange={(next) => !pending && setConfirming(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to All issues?</DialogTitle>
            <DialogDescription>
              Your agent picks the best issues across ~300 projects we picked. Your filters still apply.
              {kept ? ` ${kept}` : ''}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <span role="alert" className="text-sm text-destructive">
              {error}
            </span>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={switchToAll} disabled={pending}>
              {pending ? 'Switching…' : 'Switch to All issues'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
