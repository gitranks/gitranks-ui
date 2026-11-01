'use client';

import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { saveContributeSettings } from '../actions';
import { Pill } from './primitives';
import { SettingsRow } from './settings-rows';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { ContributeAutopilot } from '@/lib/contribute/contribute.types';
import { type ContributeErrorCode, contributeErrorMessage } from '@/lib/contribute/errors';
import { AUTOPILOT_UNLOCK_AT, dayLabel } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

export { AUTOPILOT_UNLOCK_AT };

/** Closed-unmerged pull requests in a row that lock it again. */
export const AUTOPILOT_LOCK_AT = 2;

const NO_EMAIL =
  'Autopilot emails you before each submission, and we have no email for you. Sign in again and share your GitHub email to turn it on.';
/** The setting is on, but there is no address: nothing is submitted for the user, every change waits for them. */
const NO_EMAIL_ON =
  'Autopilot emails you before each submission, and we have no email for you, so its changes wait for your review. Sign in again and share your GitHub email.';

/** Why turning autopilot on or off did not go through, in plain words. */
export function autopilotErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'INVALID' && /unlocks after/i.test(message ?? '')) {
    return `Autopilot is locked: it unlocks after ${AUTOPILOT_UNLOCK_AT} pull requests merged through GitRanks.`;
  }
  if (error === 'INVALID' && /coming|not open|unavailable/i.test(message ?? '')) {
    return 'Autopilot is coming soon: it cannot be turned on yet. Your record keeps counting until then.';
  }
  if (error === 'INVALID' && /emails you/i.test(message ?? '')) {
    return NO_EMAIL;
  }
  return contributeErrorMessage(error, message);
}

/** Where the record stands: locked, open, merges still needed and made toward unlocking, the closed streak. */
function recordOf(autopilot: ContributeAutopilot) {
  const locked = !autopilot.unlocked;
  const toUnlock = locked ? Math.max(0, autopilot.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - autopilot.mergedCount) : 0;
  return {
    locked,
    open: autopilot.available === true,
    // `undefined`: the API does not say yet; only a known "none" blocks turning it on.
    noEmail: autopilot.noticeTo === null,
    toUnlock,
    progress: Math.min(AUTOPILOT_UNLOCK_AT, Math.max(0, AUTOPILOT_UNLOCK_AT - toUnlock)),
    streak: Math.min(autopilot.closedUnmergedStreak, AUTOPILOT_LOCK_AT),
  };
}

/**
 * Autopilot's row in Settings: the user's record (merged through GitRanks, still needed to unlock, closed without merging in a row) and
 * a toggle they own once it is unlocked, with the full record behind Details. While autopilot is not open (`available` false, or not known yet), it says it
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
  const { locked, open, noEmail, progress } = recordOf(autopilot);
  const canTurnOn = open && !locked && !noEmail;
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
    <SettingsRow
      id="autopilot"
      icon={Zap}
      title={
        <>
          Autopilot
          {open ? null : (
            <Pill tone="violet">{autopilot.available === false ? 'Coming soon' : 'Not available yet'}</Pill>
          )}
        </>
      }
      value={
        <>
          {!locked
            ? `Unlocked: ${autopilot.mergedCount} merged through GitRanks`
            : autopilot.lockedAt
              ? `Locked on ${dayLabel(autopilot.lockedAt)} · ${progress} of ${AUTOPILOT_UNLOCK_AT} merged since`
              : `${progress} of ${AUTOPILOT_UNLOCK_AT} merged PRs toward unlocking`}
          {open && autopilot.noticeTo ? (
            <span data-autopilot-notice-to className="block">
              Emails before each submission go to {autopilot.noticeTo}
            </span>
          ) : null}
          {open && noEmail && !locked && canSave && !error ? (
            <span data-autopilot-no-email className="block text-warning">
              {checked ? NO_EMAIL_ON : NO_EMAIL}
            </span>
          ) : null}
          {error ? (
            <span role="alert" className="block text-destructive">
              {error}
            </span>
          ) : null}
        </>
      }
      data={{
        'data-autopilot': locked ? 'locked' : 'unlocked',
        'data-autopilot-available': autopilot.available === undefined ? 'unknown' : String(autopilot.available),
      }}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="ghost" size="sm" aria-label="Autopilot details">
            Details
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autopilot</DialogTitle>
            <DialogDescription>
              Submit without your review when every check passed and the risk is low.
            </DialogDescription>
          </DialogHeader>
          <AutopilotRecord autopilot={autopilot} />
        </DialogContent>
      </Dialog>
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
          aria-label="Autopilot"
          className="size-4.5 accent-primary"
        />
        {checked ? 'On' : open && locked ? 'Locked' : 'Off'}
      </label>
    </SettingsRow>
  );
}

/**
 * The user's autopilot record: whether it is open, merged through GitRanks, still needed to unlock, closed without
 * merging in a row, the unlock progress, and how it works once open.
 */
export function AutopilotRecord({ autopilot }: { autopilot: ContributeAutopilot }) {
  const { locked, open, toUnlock, progress, streak } = recordOf(autopilot);
  return (
    <div className="flex flex-col gap-4">
      {open ? null : (
        <p data-autopilot-coming className="text-sm">
          {autopilot.available === false
            ? 'Autopilot is coming soon. Before each submission it will email you, with an hour to stop it. Your record below keeps counting until then.'
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
        Before autopilot submits, we email you{autopilot.noticeTo ? ` at ${autopilot.noticeTo}` : ''}. You have one hour
        from that email to stop it, from the link in it, the attempt&apos;s page or My contributions. If the email
        cannot be sent, the change waits for your review instead. Two pull requests closed without merging in a row lock
        it again.
      </span>
    </div>
  );
}
