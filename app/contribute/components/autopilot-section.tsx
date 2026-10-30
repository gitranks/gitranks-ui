'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { Panel, Pill } from './primitives';
import type { ContributeAutopilot } from '@/lib/contribute/contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from '@/lib/contribute/errors';
import { AUTOPILOT_UNLOCK_AT, dayLabel } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export { AUTOPILOT_UNLOCK_AT };

/** Closed-unmerged pull requests in a row that lock it again. */
export const AUTOPILOT_LOCK_AT = 2;

/** Why turning autopilot on or off did not go through, in plain words. */
export function autopilotErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'INVALID' && /unlocks after/i.test(message ?? '')) {
    return `Autopilot is locked: it unlocks after ${AUTOPILOT_UNLOCK_AT} pull requests merged through GitRanks.`;
  }
  if (error === 'INVALID' && /coming|not open|unavailable/i.test(message ?? '')) {
    return 'Autopilot is coming soon: it cannot be turned on yet. Your record keeps counting until then.';
  }
  return contributeErrorMessage(error, message);
}

/**
 * Autopilot: the user's record (merged through GitRanks, still needed to unlock, closed without merging in a row) and
 * a toggle they own once it is unlocked. While autopilot is not open (`available` false, or not known yet), it says it
 * is coming and the toggle cannot be turned on; a setting left on can always be turned off.
 */
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
  const open = autopilot.available === true;
  const canTurnOn = open && !locked;
  const toUnlock = locked ? Math.max(0, autopilot.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - autopilot.mergedCount) : 0;
  const progress = Math.min(AUTOPILOT_UNLOCK_AT, Math.max(0, AUTOPILOT_UNLOCK_AT - toUnlock));
  const streak = Math.min(autopilot.closedUnmergedStreak, AUTOPILOT_LOCK_AT);
  const checked = canTurnOn ? on : on && enabled;

  const toggle = (next: boolean) => {
    setOn(next);
    setError(null);
    startTransition(async () => {
      const result = await saveContributeSettings({ autopilot: next });
      if (!result.ok) {
        setOn(!next);
        setError(autopilotErrorMessage(result.error, result.message));
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
        data-autopilot-available={autopilot.available === undefined ? 'unknown' : String(autopilot.available)}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Autopilot</h2>
            {open ? null : (
              <Pill tone="violet">{autopilot.available === false ? 'Coming soon' : 'Not available yet'}</Pill>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Submit without your review when every check passed and the risk is low.
          </p>
        </div>
        <label
          htmlFor={`${id}-autopilot`}
          className={cn('flex items-center gap-2.5 text-sm', !canTurnOn && 'text-muted-foreground')}
        >
          <input
            id={`${id}-autopilot`}
            type="checkbox"
            checked={checked}
            disabled={pending || !canSave || (!canTurnOn && !checked)}
            onChange={(event) => toggle(event.target.checked)}
            className="size-4.5 accent-primary"
          />
          {checked ? 'On' : open && locked ? 'Locked' : 'Off'}
        </label>
      </div>

      {open ? null : (
        <p data-autopilot-coming className="text-sm">
          {autopilot.available === false
            ? 'Autopilot is coming soon. It opens once we can tell you before each submission, with an hour to stop it. Your record below keeps counting until then.'
            : 'Autopilot is not available yet. It is coming soon.'}
        </p>
      )}

      <dl data-autopilot-record className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted-foreground">Merged through GitRanks</dt>
        <dd className="font-mono">{autopilot.mergedCount}</dd>
        <dt className="text-muted-foreground">Still needed to unlock</dt>
        <dd className="font-mono">{locked ? toUnlock : 'none, unlocked'}</dd>
        <dt className="text-muted-foreground">Closed without merging in a row</dt>
        <dd className="font-mono">
          {streak} of {AUTOPILOT_LOCK_AT}
        </dd>
      </dl>

      {locked ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span>
              {progress} of {AUTOPILOT_UNLOCK_AT} merged PRs
            </span>
            <span className="text-muted-foreground">unlocks at {AUTOPILOT_UNLOCK_AT}</span>
          </div>
          <div aria-hidden="true" className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: AUTOPILOT_UNLOCK_AT }, (_, index) => (
              <span key={index} className={cn('h-1.5 rounded-sm', index < progress ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
          {autopilot.lockedAt ? (
            <span data-autopilot-locked-at className="text-sm text-warning">
              Locked on {dayLabel(autopilot.lockedAt)}: two pull requests in a row were closed without merging.{' '}
              {AUTOPILOT_UNLOCK_AT} merged since then unlock it again.
            </span>
          ) : autopilot.closedUnmergedStreak >= AUTOPILOT_LOCK_AT ? (
            <span className="text-sm text-warning">
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
        Once it is open: before autopilot submits, you have one hour to stop it, from the attempt&apos;s page or My
        contributions. Two pull requests closed without merging in a row lock it again.
      </span>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </Panel>
  );
}
