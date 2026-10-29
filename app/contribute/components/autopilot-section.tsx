'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { Panel, PanelTitle } from './primitives';
import type { ContributeAutopilot } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { cn } from '@/lib/utils';

/** Merged pull requests through GitRanks that unlock autopilot. */
export const AUTOPILOT_UNLOCK_AT = 3;

/** Autopilot: locked until three merged pull requests, then a toggle the user owns. */
export function AutopilotSection({
  autopilot,
  enabled,
  canSave,
}: {
  autopilot: ContributeAutopilot;
  enabled: boolean;
  /** Settings exist only once a key is connected. */
  canSave: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = !autopilot.unlocked;
  const merged = Math.min(autopilot.mergedCount, AUTOPILOT_UNLOCK_AT);

  const toggle = (next: boolean) => {
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await saveContributeSettings({ autopilot: next });
      if (!result.ok) {
        setOn(!next);
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });
  };

  return (
    <Panel id="autopilot">
      <div
        className="flex flex-wrap items-center justify-between gap-3"
        data-autopilot={locked ? 'locked' : 'unlocked'}
      >
        <PanelTitle title="Autopilot" text="Submit without your review when every check passed and the risk is low." />
        <label
          htmlFor={`${id}-autopilot`}
          className={cn('flex items-center gap-2.5 text-sm', locked && 'text-muted-foreground')}
        >
          <input
            id={`${id}-autopilot`}
            type="checkbox"
            checked={!locked && on}
            disabled={locked || pending || !canSave}
            onChange={(event) => toggle(event.target.checked)}
            className="size-4.5 accent-primary"
          />
          {locked ? 'Locked' : on ? 'On' : 'Off'}
        </label>
      </div>
      {locked ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>
              {merged} of {AUTOPILOT_UNLOCK_AT} merged PRs
            </span>
            <span className="text-muted-foreground">unlocks at {AUTOPILOT_UNLOCK_AT}</span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: AUTOPILOT_UNLOCK_AT }, (_, index) => (
              <span key={index} className={cn('h-1.5 rounded-sm', index < merged ? 'bg-[#8250df]' : 'bg-border')} />
            ))}
          </div>
          {autopilot.closedUnmergedStreak >= 2 ? (
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Locked again: your last two pull requests were closed without merging.
            </span>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">
          Unlocked: {autopilot.mergedCount} of your pull requests were merged through GitRanks.
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Before an autopilot PR opens you get an email with the diff and one hour to stop it. Two PRs closed without
        merging in a row lock autopilot again.
      </span>
      {error ? (
        <span role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </Panel>
  );
}
