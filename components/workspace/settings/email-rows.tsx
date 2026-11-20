'use client';

import { Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, useTransition } from 'react';

import { SettingsGroup, SettingsList, SettingsRow } from '@/components/workspace/settings-rows';
import { setContributeEmail } from '@/lib/workspace/actions';
import type { ContributeEmail } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';

export const EMAIL_TITLE = 'Email from Contribute';
export const EMAIL_OFF = 'Off. You get no review reminders or other Contribute email.';
export const EMAIL_AUTOPILOT_NOTE = "Autopilot's notices still come while autopilot is on.";

/** With no address stored nothing is ever sent: the row is drawn, off, and says how to give one. */
export const EMAIL_NO_ADDRESS =
  'We have no email address for you. Add a public email on GitHub, or sign in again to share one.';

/** Where the email goes, in plain words: the masked address, off, or that there is no address. */
export const emailValueOf = ({ on, to }: ContributeEmail): string =>
  !to ? EMAIL_NO_ADDRESS : on ? `Review reminders and other Contribute email go to ${to}.` : EMAIL_OFF;

/**
 * Settings' Email group, the slot W4 fills with its rows (`EmailRows`). Until then, today's one row (`#email`, so a link
 * or an email can point at it): whether Contribute's email is on and where it goes, and a switch that saves at once.
 * The switch moves when clicked and moves back, with why, when the save fails; a change while one is saving is
 * ignored. The group is always drawn: with no address the switch is off and disabled, under why.
 */
export function EmailRows({ email }: { email: ContributeEmail }) {
  const router = useRouter();
  const id = useId();
  const [shown, setShown] = useState<ContributeEmail>(email);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Set at once, before the transition's pending state renders, so a quick second change is ignored too.
  const saving = useRef(false);

  const toggle = (next: boolean) => {
    if (saving.current) return;
    saving.current = true;
    const before = shown;
    setShown({ ...before, on: next });
    setError(null);
    startTransition(async () => {
      const result = await setContributeEmail(next).catch(() => null);
      saving.current = false;
      if (!result?.ok) {
        setShown(before);
        setError(result ? contributeErrorMessage(result.error, result.message) : contributeErrorMessage('FAILED'));
        return;
      }
      setShown(result.data);
      router.refresh();
    });
  };

  const noAddress = !shown.to;
  return (
    <SettingsGroup id="settings-email" title="Email">
      <SettingsList>
        <SettingsRow
          id="email"
          icon={Mail}
          title={EMAIL_TITLE}
          value={
            <>
              <span id={`${id}-value`} className="block">
                {emailValueOf(shown)}
              </span>
              {noAddress ? null : <span className="block text-xs">{EMAIL_AUTOPILOT_NOTE}</span>}
              {error ? (
                <span role="alert" className="block text-destructive">
                  {error}
                </span>
              ) : null}
            </>
          }
          data={{ 'data-email': noAddress ? 'no-address' : shown.on ? 'on' : 'off' }}
        >
          <label
            htmlFor={`${id}-email`}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm sm:min-h-0"
          >
            <input
              id={`${id}-email`}
              type="checkbox"
              // biome-ignore lint/a11y/useAriaPropsForRole: a native checkbox: the switch role reads its checked state, so aria-checked would only repeat it.
              role="switch"
              aria-label={EMAIL_TITLE}
              aria-describedby={`${id}-value`}
              aria-disabled={pending || undefined}
              checked={shown.on && !noAddress}
              disabled={noAddress}
              onChange={(event) => toggle(event.target.checked)}
              className="size-4.5 accent-primary aria-disabled:opacity-60"
            />
            {shown.on && !noAddress ? 'On' : 'Off'}
          </label>
        </SettingsRow>
      </SettingsList>
    </SettingsGroup>
  );
}
