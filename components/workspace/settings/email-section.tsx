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

/** Contribute's email with an address to send it to: the only kind Settings shows. */
export type ShownEmail = ContributeEmail & { to: string };

/** The email has an address: with none stored nothing is ever sent, so Settings shows no row. */
export const isShownEmail = (email: ContributeEmail | null | undefined): email is ShownEmail => !!email?.to;

/** Where the email goes, in plain words: the masked address, or off. */
export const emailValueOf = ({ on, to }: ShownEmail): string =>
  on ? `Review reminders and other Contribute email go to ${to}.` : EMAIL_OFF;

/**
 * Settings' Email group: one row (`#email`, so a link or an email can point at it) with whether Contribute's email is on
 * and where it goes, and a switch that saves at once. The switch moves when clicked and moves back, with why, when the
 * save fails; a change while one is saving is ignored. A save that answers no address takes the group away.
 */
export function EmailSection({ email }: { email: ShownEmail }) {
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

  if (!isShownEmail(shown)) return null;
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
              checked={shown.on}
              onChange={(event) => toggle(event.target.checked)}
              className="size-4.5 accent-primary aria-disabled:opacity-60"
            />
            {shown.on ? 'On' : 'Off'}
          </label>
        </SettingsRow>
      </SettingsList>
    </SettingsGroup>
  );
}
