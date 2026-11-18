'use client';

import { Mail } from 'lucide-react';
import { useId, useState, useTransition } from 'react';

import { setContributeEmail } from '../actions';
import { SettingsRow } from './settings-rows';
import type { ContributeEmail } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';

export const EMAIL_TITLE = 'Email from GitRanks';
export const EMAIL_OFF = 'Off. You get no review reminders or other GitRanks email.';
export const EMAIL_AUTOPILOT_NOTE = "Autopilot's notices still come while autopilot is on.";

/** GitRanks email with an address to send it to: the only kind Settings shows. */
export type ShownEmail = ContributeEmail & { to: string };

/** The email has an address: with none stored nothing is ever sent, so Settings shows no row. */
export const isShownEmail = (email: ContributeEmail | null | undefined): email is ShownEmail => !!email?.to;

/** Where the email goes, in plain words: the masked address, or off. */
export const emailValueOf = ({ on, to }: ShownEmail): string =>
  on ? `Review reminders and updates go to ${to}.` : EMAIL_OFF;

/**
 * GitRanks email's row in Settings (`#email`, so a link or an email can point at it): on or off and where it goes, and
 * a switch that saves at once. The switch moves when clicked and moves back, with why, when the save fails.
 */
export function EmailSection({ email }: { email: ShownEmail }) {
  const id = useId();
  const [shown, setShown] = useState(email);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    const before = shown;
    setShown({ ...before, on: next });
    setError(null);
    startTransition(async () => {
      const result = await setContributeEmail(next).catch(() => null);
      if (!result?.ok) {
        setShown(before);
        setError(result ? contributeErrorMessage(result.error, result.message) : contributeErrorMessage('FAILED'));
        return;
      }
      setShown({ on: result.data.on, to: result.data.to ?? before.to });
    });
  };

  return (
    <SettingsRow
      id="email"
      icon={Mail}
      title={EMAIL_TITLE}
      value={
        <>
          <span id={`${id}-value`} className="block">
            {emailValueOf(shown)}
          </span>
          <span className="block text-xs">{EMAIL_AUTOPILOT_NOTE}</span>
          {error ? (
            <span role="alert" className="block text-destructive">
              {error}
            </span>
          ) : null}
        </>
      }
      data={{ 'data-email': shown.on ? 'on' : 'off' }}
    >
      <label htmlFor={`${id}-email`} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0">
        <input
          id={`${id}-email`}
          type="checkbox"
          role="switch"
          aria-checked={shown.on}
          aria-label={EMAIL_TITLE}
          aria-describedby={`${id}-value`}
          checked={shown.on}
          disabled={pending}
          onChange={(event) => toggle(event.target.checked)}
          className="size-4.5 accent-primary"
        />
        {shown.on ? 'On' : 'Off'}
      </label>
    </SettingsRow>
  );
}
